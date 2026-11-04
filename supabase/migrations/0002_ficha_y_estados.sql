-- 0002 · Ficha ampliada, estado "Esperando repuesto", foto y cambio de QR.
-- Solo agrega: no borra ni modifica datos existentes. Se puede correr una sola vez.

-- 1) Estado nuevo del taller: Esperando repuesto
alter table repair_orders drop constraint if exists repair_orders_status_check;
alter table repair_orders add constraint repair_orders_status_check
  check (status in ('en_revision','presupuestado','esperando_repuesto','en_reparacion','reparado','entregado','faltante','sin_reparacion'));

create or replace function status_label(kind text, v text) returns text
language sql immutable as $$
  select case kind
    when 'repair' then case v
      when 'en_revision' then 'En revisión' when 'presupuestado' then 'Presupuestado'
      when 'esperando_repuesto' then 'Esperando repuesto'
      when 'en_reparacion' then 'En reparación' when 'reparado' then 'Reparado'
      when 'entregado' then 'Entregado' when 'faltante' then 'Faltante'
      when 'sin_reparacion' then 'Sin reparación' else v end
    else case v
      when 'operativo' then 'Operativo' when 'no_operativo' then 'No operativo'
      when 'en_taller' then 'En taller' when 'faltante' then 'Faltante'
      when 'baja' then 'Dado de baja' else v end
  end
$$;

-- 2) Datos extra del equipo (opcionales)
alter table equipment add column if not exists condition text check (condition in ('propio','comodato','alquiler'));
alter table equipment add column if not exists purchased_on date;
alter table equipment add column if not exists classification text;

-- 3) Hoja de vida: tipos nuevos (cambio de QR, foto)
alter table history_entries drop constraint if exists history_entries_type_check;
alter table history_entries add constraint history_entries_type_check check (type in (
  'alta','edicion','estado','ubicacion','ingreso','orden_estado','egreso',
  'nota','reporte_qr','preventivo','prestamo','devolucion','adjunto','baja','qr','foto'));

-- Las ediciones de datos quedan anotadas con qué campos cambiaron
create or replace function log_equipment() returns trigger
language plpgsql security definer set search_path = public as $$
declare changed text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into history_entries (equipment_id, type, summary, created_by, created_by_name)
    values (new.id, 'alta', 'Alta de ' || new.equipment_type || coalesce(' ' || new.brand, '') || coalesce(' ' || new.model, ''),
            auth.uid(), current_signature());
    return new;
  end if;
  if new.status is distinct from old.status and coalesce(current_setting('nyb.auto_status', true), '') <> '1' then
    insert into history_entries (equipment_id, type, summary, data, visible_on_qr, created_by, created_by_name)
    values (new.id, case when new.status = 'baja' then 'baja' else 'estado' end,
            'Estado: ' || status_label('equipment', old.status) || ' → ' || status_label('equipment', new.status) || coalesce(' (' || new.status_reason || ')', ''),
            jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.status_reason),
            true, auth.uid(), current_signature());
  end if;
  if new.site_id is distinct from old.site_id or new.sector is distinct from old.sector or new.client_id is distinct from old.client_id then
    insert into history_entries (equipment_id, type, summary, data, created_by, created_by_name)
    values (new.id, 'ubicacion', 'Cambio de ubicación',
            jsonb_build_object('from', jsonb_build_object('client', old.client_id, 'site', old.site_id, 'sector', old.sector),
                               'to',   jsonb_build_object('client', new.client_id, 'site', new.site_id, 'sector', new.sector)),
            auth.uid(), current_signature());
  end if;
  if new.equipment_type is distinct from old.equipment_type then changed := array_append(changed, 'tipo'); end if;
  if new.brand is distinct from old.brand then changed := array_append(changed, 'marca'); end if;
  if new.model is distinct from old.model then changed := array_append(changed, 'modelo'); end if;
  if new.serial is distinct from old.serial then changed := array_append(changed, 'serial'); end if;
  if new.asset_number is distinct from old.asset_number then changed := array_append(changed, 'patrimonio'); end if;
  if new.umdns_code is distinct from old.umdns_code then changed := array_append(changed, 'UMDNS'); end if;
  if new.condition is distinct from old.condition then changed := array_append(changed, 'condición'); end if;
  if new.classification is distinct from old.classification then changed := array_append(changed, 'clasificación'); end if;
  if new.manufactured_on is distinct from old.manufactured_on then changed := array_append(changed, 'fecha de fabricación'); end if;
  if new.purchased_on is distinct from old.purchased_on then changed := array_append(changed, 'fecha de compra'); end if;
  if new.warranty_until is distinct from old.warranty_until then changed := array_append(changed, 'garantía'); end if;
  if new.notes is distinct from old.notes then changed := array_append(changed, 'notas'); end if;
  if array_length(changed, 1) > 0 then
    insert into history_entries (equipment_id, type, summary, data, created_by, created_by_name)
    values (new.id, 'edicion', 'Datos editados: ' || array_to_string(changed, ', '),
            jsonb_build_object('fields', changed), auth.uid(), current_signature());
  end if;
  return new;
end $$;

-- 4) Foto del equipo (una por equipo, comprimida en el navegador antes de subir)
create table if not exists equipment_photos (
  equipment_id uuid primary key references equipment(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  data bytea not null check (octet_length(data) between 1 and 1572864),  -- 1,5 MB
  uploaded_by uuid references staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table equipment_photos enable row level security;
drop policy if exists staff_read on equipment_photos;
drop policy if exists staff_write on equipment_photos;
create policy staff_read on equipment_photos for select to authenticated using (is_staff());
create policy staff_write on equipment_photos for all to authenticated using (is_staff()) with check (is_staff());
grant select, insert, update, delete on equipment_photos to authenticated;
revoke all on equipment_photos from anon;
