-- Dar de alta a una persona del equipo NYB.
-- 1) En Supabase → Authentication → Users → "Add user" → con email y contraseña (marcar "Auto Confirm User").
-- 2) Copiar este bloque en Supabase → SQL Editor, cambiar el email, el nombre y el rol, y ejecutar.
--    Rol: 'admin' (puede crear plantillas y usuarios) o 'tecnico'.

insert into public.staff (id, full_name, role)
select id, 'Juan Manuel Brahim', 'admin'
from auth.users
where email = 'administracion@nybmedical.com';

-- Para quitarle el acceso a alguien sin borrar su firma de la hoja de vida:
-- update public.staff set active = false where id = (select id from auth.users where email = 'persona@ejemplo.com');
