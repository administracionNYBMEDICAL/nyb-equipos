# Equipos · NYB Medical

Plataforma interna de NYB Medical: cada equipo que pasa por el taller tiene su código NYB, su etiqueta QR y su hoja de vida. Reemplaza a la planilla "EQUIPAMIENTO EN REPARACIÓN - NYB".

- **Personal NYB** (con usuario): inventario, taller, hoja de vida, etiquetas.
- **Cliente** (escanea el QR, sin usuario): ve el equipo, su estado, último servicio, próximo preventivo y el historial que NYB marcó como visible. Nunca ve costos, presupuestos, remitos, técnicos ni al cliente intermediario.

Stack: Next.js 16 · Supabase (Postgres + Auth) · Vercel.

## Puesta en marcha (una sola vez)

### 1. Base de datos en Supabase
1. Crear un proyecto nuevo. Región: **São Paulo (sa-east-1)**, la más cercana.
2. **SQL Editor** → pegar todo `supabase/migrations/0001_schema.sql` → **Run**.
3. **Authentication → Users → Add user**: email y contraseña de cada persona (marcar *Auto Confirm User*).
4. **SQL Editor** → `scripts/alta-usuario.sql`, una vez por persona, con su email, nombre y rol.
5. **Authentication → Sign In / Providers**: desactivar *Allow new users to sign up* (solo entra quien NYB da de alta).

### 2. App en Vercel
1. **Add New → Project** → importar el repositorio `nyb-equipos`.
2. **Environment Variables** (ver `.env.example`):
   - `DATABASE_URL`: Supabase → Connect → *Transaction pooler* (puerto 6543), con la contraseña de la base.
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API.
   - `APP_URL`: `https://equipos.nybmedical.com`
3. **Deploy**.

### 3. Dominio
Vercel → Project → **Settings → Domains** → agregar `equipos.nybmedical.com`. Vercel muestra un registro **CNAME**: cargarlo en el DNS de `nybmedical.com` (donde se compró el dominio).

> **Importante:** la dirección `APP_URL` queda impresa en cada etiqueta. Definirla antes de imprimir y no cambiarla después. La ruta `/q/` tampoco se cambia nunca.

## Desarrollo local
```bash
npm install
cp .env.example .env.local   # completar
npm run dev
```
Sin Supabase se puede probar contra un Postgres local: `scripts/supabase-shim.sql` → migración → `scripts/grants-dev.sql` → `scripts/seed-dev.sql`, y `DEV_AUTH_USER_ID` en `.env.local`. Ese modo está bloqueado en Vercel.

## Dónde está cada cosa
- `supabase/migrations/` esquema, reglas de acceso (RLS), hoja de vida de solo agregado, ficha pública.
- `lib/data.ts` todas las consultas. `lib/auth.ts` sesión y personal.
- `app/(app)/` pantallas internas. `app/q/[token]` ficha pública del QR.
- `replica/` el plan: recon, arquitectura, diseño, matriz de funciones y registro de construcción.
