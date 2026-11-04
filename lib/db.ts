import "server-only";
import { Pool, types, type PoolClient } from "pg";

// Las columnas DATE se leen como texto AAAA-MM-DD (sin corrimientos por zona horaria).
types.setTypeParser(1082, (v) => v);

// Una conexión directa a Postgres (en Supabase: el "connection pooler", modo transacción).
// Cada operación corre en una transacción con el rol y el usuario del pedido, así
// las reglas de acceso (RLS) y la firma de la hoja de vida (auth.uid()) las aplica la base.

declare global {
  var __nybPool: Pool | undefined;
}

function pool(): Pool {
  if (!globalThis.__nybPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL");
    globalThis.__nybPool = new Pool({
      connectionString: url,
      max: 5,
      ssl: url.includes("supabase.") ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalThis.__nybPool;
}

export type Tx = PoolClient;

/** Ejecuta fn como el usuario del personal NYB `userId`. */
export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Ejecuta fn sin usuario (visitante que escaneó un QR): solo funciones públicas. */
export async function asAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("set local role anon");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
