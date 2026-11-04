-- SOLO DESARROLLO LOCAL: permisos que Supabase da por defecto al rol authenticated.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on maintenance_status to authenticated;
