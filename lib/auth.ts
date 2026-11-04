import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { supabaseConfigured, supabaseServer } from "./supabase/server";
import { asUser } from "./db";

export type Staff = { id: string; fullName: string; role: "admin" | "tecnico" };

/** Id del usuario con sesión, o null. */
const sessionUserId = cache(async (): Promise<string | null> => {
  await connection(); // todo lo que depende del usuario se genera en cada pedido, nunca en la compilación
  if (!supabaseConfigured()) {
    // Modo de prueba local sin Supabase. En Vercel está prohibido.
    if (process.env.VERCEL) throw new Error("Supabase no está configurado");
    return process.env.DEV_AUTH_USER_ID ?? null;
  }
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** El usuario del personal NYB con sesión, o null si no hay sesión o no es del personal. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const id = await sessionUserId();
  if (!id) return null;
  const row = await asUser(id, async (tx) => {
    const r = await tx.query(
      "select id, full_name, role from staff where id = $1 and active",
      [id],
    );
    return r.rows[0];
  });
  return row ? { id: row.id, fullName: row.full_name, role: row.role } : null;
});

/** Para páginas y acciones internas: sin sesión → /login; con sesión pero sin alta en el personal → aviso. */
export async function requireStaff(): Promise<Staff> {
  const id = await sessionUserId();
  if (!id) redirect("/login");
  const staff = await getStaff();
  if (!staff) redirect("/login?error=sin-acceso");
  return staff;
}
