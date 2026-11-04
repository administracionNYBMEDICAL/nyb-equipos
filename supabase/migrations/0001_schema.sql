-- NYB Medical · plataforma interna de equipos con QR
-- Postgres 15+ (Supabase). Todas las fechas en timestamptz (UTC); se muestran en America/Argentina/Buenos_Aires.
-- Dinero en centavos (bigint) + moneda.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Usuarios del equipo NYB (2 a 5). auth.users lo maneja Supabase.
-- ---------------------------------------------------------------
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'tecnico' check (role in ('admin','tecnico')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active)
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active and role = 'admin')
$$;

-- ---------------------------------------------------------------
-- Clientes (quién envía / paga: OFIUKO, Clínica Privada Monte Grande...)
-- y sitios (dónde está el equipo: Hospital Alende, Hospital SARDA...).
-- Un cliente directo tiene un sitio con su mismo nombre.
-- ---------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuit text,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index clients_name_uq on clients (lower(name));

create table sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  name text not null,
  address text,
  locality text,
  province text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on sites (client_id);
create unique index sites_client_name_uq on sites (client_id, lower(name));

-- ---------------------------------------------------------------
-- Equipos. Identidad = qr_token (el serial puede faltar: "sin numero").
-- owner = 'cliente' para equipos de clientes, 'nyb' para equipos propios
-- (préstamo / loaners).
-- ---------------------------------------------------------------
create sequence equipment_code_seq;

create table equipment (
  id uuid primary key default gen_random_uuid(),
  -- token en la URL del QR: 12 caracteres URL-safe, no adivinable, nunca cambia
  qr_token text not null unique default translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_'),
  code text not null unique default 'NYB-' || lpad(nextval('equipment_code_seq')::text, 6, '0'),  -- legible, va en la etiqueta
  owner text not null default 'cliente' check (owner in ('cliente','nyb')),
  client_id uuid references clients(id) on delete restrict,
  site_id uuid references sites(id) on delete restrict,
  sector text,                                     -- Neo, Pediatría, Cirugía, Ambulancias...
  equipment_type text not null,                    -- Respirador de Terapia, Bomba Jeringa...
  brand text,
  model text,
  serial text,                                     -- null si no tiene número
  umdns_code text,
  asset_number text,                               -- nº de patrimonio del hospital
  status text not null default 'operativo'
    check (status in ('operativo','no_operativo','en_taller','faltante','baja')),
  status_reason text,
  manufactured_on date,
  warranty_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_client check ((owner = 'nyb') or (client_id is not null))
);
create index on equipment (client_id);
create index on equipment (site_id);
create index on equipment (status);
create index on equipment (equipment_type);
-- mismo equipo no se carga dos veces: marca+modelo+serial únicos cuando hay serial
create unique index equipment_serial_uq
  on equipment (lower(coalesce(brand,'')), lower(coalesce(model,'')), lower(serial))
  where serial is not null and serial <> '';

-- ---------------------------------------------------------------
-- Órdenes de reparación (un ingreso al taller). Reemplaza la planilla.
-- ---------------------------------------------------------------
create sequence repair_order_seq;

create table repair_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default 'OT-' || to_char(now() at time zone 'America/Argentina/Buenos_Aires','YYYY') || '-' || lpad(nextval('repair_order_seq')::text, 4, '0'),
  equipment_id uuid not null references equipment(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,   -- quién lo manda/paga
  received_at date not null,
  pickup_remito text,                              -- NRO. Remito Retiro
  accessories_in text,                             -- Accesorios con los que ingresó
  reported_fault text,                             -- Falla / Desperfecto
  status text not null default 'en_revision'
    check (status in ('en_revision','presupuestado','en_reparacion','reparado','entregado','faltante','sin_reparacion')),
  technician_id uuid references staff(id) on delete set null,
  technician_name text,                            -- para importados sin usuario (p. ej. LUIS BERNAL)
  budget_number text,
  budget_date date,
  budget_cents bigint check (budget_cents is null or budget_cents >= 0),
  cost_cents bigint check (cost_cents is null or cost_cents >= 0),
  currency text not null default 'ARS' check (currency in ('ARS','USD')),
  delivered_at date,
  delivery_remito text,                            -- NRO. Remito Entrega
  comments text,
  source text not null default 'app' check (source in ('app','planilla','qr')),
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivered_needs_date check (status <> 'entregado' or delivered_at is not null or source = 'planilla'),
  constraint delivered_after_received check (delivered_at is null or delivered_at >= received_at)
);
create index on repair_orders (equipment_id, received_at desc);
create index on repair_orders (client_id);
create index on repair_orders (status);
create index on repair_orders (technician_id);
-- un equipo no puede tener dos ingresos abiertos a la vez
create unique index repair_orders_one_open
  on repair_orders (equipment_id)
  where status not in ('entregado','faltante','sin_reparacion');

create table repair_parts (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references repair_orders(id) on delete cascade,
  description text not null,                       -- Celda de O2, batería, flex...
  quantity int not null default 1 check (quantity > 0),
  is_consumable boolean not null default false,
  disposition text not null default 'devuelto'
    check (disposition in ('devuelto','descartado','pendiente')),  -- práctica NYB: se devuelve, consumibles se descartan
  created_at timestamptz not null default now()
);
create index on repair_parts (repair_order_id);

-- ---------------------------------------------------------------
-- Reportes de falla del cliente vía QR (sin cuenta).
-- ---------------------------------------------------------------
create table tickets (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  reporter_name text not null check (length(reporter_name) between 2 and 120),
  reporter_contact text check (length(reporter_contact) <= 160),
  description text not null check (length(description) between 5 and 2000),
  status text not null default 'nuevo' check (status in ('nuevo','en_curso','convertido','descartado')),
  repair_order_id uuid references repair_orders(id) on delete set null,
  ip_hash text,                                    -- para rate limit, sin guardar la IP
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on tickets (equipment_id, created_at desc);
create index on tickets (status);

-- ---------------------------------------------------------------
-- Preventivos: plantillas versionadas tipo checklist.
-- ---------------------------------------------------------------
create table maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- "Preventivo anual respirador Neumovent"
  kind text not null default 'preventivo'
    check (kind in ('preventivo','seguridad_electrica','calibracion')),
  equipment_type text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cada edición crea una versión nueva; las versiones no se modifican
create table maintenance_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references maintenance_templates(id) on delete restrict,
  version int not null,
  -- items: [{ "key": "fugas", "label": "Prueba de fugas", "type": "yes_no" | "numeric",
  --           "unit": "mL", "min": 0, "max": 50, "required": true }]
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  template_id uuid not null references maintenance_templates(id) on delete restrict,
  interval_months int not null check (interval_months between 1 and 60),
  responsible_id uuid references staff(id) on delete set null,
  next_due_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_id, template_id)
);
create index on maintenance_plans (next_due_on) where active;
create index on maintenance_plans (responsible_id);

create table maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references maintenance_plans(id) on delete set null,
  equipment_id uuid not null references equipment(id) on delete restrict,
  template_version_id uuid not null references maintenance_template_versions(id) on delete restrict,
  repair_order_id uuid references repair_orders(id) on delete set null,  -- si se hizo dentro de un ingreso
  executed_on date not null,
  executed_by uuid not null references staff(id) on delete restrict,
  answers jsonb not null,
  passed boolean not null,
  certificate_path text,                           -- PDF en Storage (seguridad eléctrica, etc.)
  created_at timestamptz not null default now()
);
create index on maintenance_runs (equipment_id, executed_on desc);
create index on maintenance_runs (plan_id);

-- ---------------------------------------------------------------
-- Préstamos de equipos propios de NYB.
-- ---------------------------------------------------------------
create table loans (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete restrict,
  client_id uuid not null references clients(id) on delete restrict,
  site_id uuid references sites(id) on delete set null,
  repair_order_id uuid references repair_orders(id) on delete set null,  -- préstamo mientras se repara su equipo
  out_on date not null,
  expected_back_on date,
  returned_on date,
  notes text,
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint returned_after_out check (returned_on is null or returned_on >= out_on)
);
create index on loans (equipment_id);
create index on loans (client_id);
create unique index loans_one_active on loans (equipment_id) where returned_on is null;

-- ---------------------------------------------------------------
-- Adjuntos (fotos, manuales, certificados) en Supabase Storage.
-- ---------------------------------------------------------------
create table attachments (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id) on delete cascade,
  repair_order_id uuid references repair_orders(id) on delete cascade,
  path text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),  -- 25 MB
  public_on_qr boolean not null default false,     -- p. ej. certificado visible para el cliente
  uploaded_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint attached_to_something check (equipment_id is not null or repair_order_id is not null)
);
create index on attachments (equipment_id);
create index on attachments (repair_order_id);

-- ---------------------------------------------------------------
-- Hoja de vida: historial append-only, fechado y firmado.
-- La escriben triggers y la app; nadie puede editar ni borrar.
-- ---------------------------------------------------------------
create table history_entries (
  id bigint generated always as identity primary key,
  equipment_id uuid not null references equipment(id) on delete restrict,
  type text not null check (type in (
    'alta','edicion','estado','ubicacion','ingreso','orden_estado','egreso',
    'nota','reporte_qr','preventivo','prestamo','devolucion','adjunto','baja')),
  summary text not null,
  data jsonb not null default '{}',
  ref_table text,
  ref_id uuid,
  visible_on_qr boolean not null default false,    -- qué ve el cliente al escanear
  created_by uuid references staff(id) on delete restrict,   -- null = reporte anónimo por QR
  created_by_name text not null,                   -- firma congelada al momento
  created_at timestamptz not null default now()
);
create index on history_entries (equipment_id, created_at desc);

create or replace function history_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'history_entries es de solo agregado: no se puede % un registro', lower(tg_op);
end $$;
create trigger history_no_update before update or delete on history_entries
  for each row execute function history_is_append_only();
create trigger history_no_truncate before truncate on history_entries
  for each statement execute function history_is_append_only();

-- Firma: nombre del usuario actual, o 'Reporte por QR'
create or replace function current_signature() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from staff where id = auth.uid()), 'Sistema')
$$;

-- Etiquetas en castellano para lo que se escribe en la hoja de vida
create or replace function status_label(kind text, v text) returns text
language sql immutable as $$
  select case kind
    when 'repair' then case v
      when 'en_revision' then 'En revisión' when 'presupuestado' then 'Presupuestado'
      when 'en_reparacion' then 'En reparación' when 'reparado' then 'Reparado'
      when 'entregado' then 'Entregado' when 'faltante' then 'Faltante'
      when 'sin_reparacion' then 'Sin reparación' else v end
    else case v
      when 'operativo' then 'Operativo' when 'no_operativo' then 'No operativo'
      when 'en_taller' then 'En taller' when 'faltante' then 'Faltante'
      when 'baja' then 'Dado de baja' else v end
  end
$$;

-- Cambios de estado de una orden -> hoja de vida
create or replace function log_repair_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into history_entries (equipment_id, type, summary, data, ref_table, ref_id, visible_on_qr, created_by, created_by_name)
    values (new.equipment_id, 'ingreso',
            'Ingreso al taller ' || new.number || coalesce(': ' || new.reported_fault, ''),
            jsonb_build_object('status', new.status, 'remito', new.pickup_remito, 'accesorios', new.accessories_in),
            'repair_orders', new.id, true, auth.uid(), current_signature());
  elsif new.status is distinct from old.status then
    insert into history_entries (equipment_id, type, summary, data, ref_table, ref_id, visible_on_qr, created_by, created_by_name)
    values (new.equipment_id,
            case when new.status = 'entregado' then 'egreso' else 'orden_estado' end,
            new.number || ': ' || status_label('repair', old.status) || ' → ' || status_label('repair', new.status),
            jsonb_build_object('from', old.status, 'to', new.status),
            'repair_orders', new.id, new.status in ('reparado','entregado'), auth.uid(), current_signature());
  end if;
  return new;
end $$;
create trigger repair_orders_history after insert or update on repair_orders
  for each row execute function log_repair_order();

-- Estado o ubicación del equipo -> hoja de vida
create or replace function log_equipment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into history_entries (equipment_id, type, summary, created_by, created_by_name)
    values (new.id, 'alta', 'Alta de ' || new.equipment_type || coalesce(' ' || new.brand, '') || coalesce(' ' || new.model, ''),
            auth.uid(), current_signature());
    return new;
  end if;
  -- Si el cambio de estado lo provoca una orden de taller (nyb.auto_status = 1), ya queda anotado por la orden.
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
  return new;
end $$;
create trigger equipment_history after insert or update on equipment
  for each row execute function log_equipment();

-- Al registrar un preventivo: hoja de vida + reprogramar el siguiente
create or replace function after_maintenance_run() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into history_entries (equipment_id, type, summary, data, ref_table, ref_id, visible_on_qr, created_by, created_by_name)
  values (new.equipment_id, 'preventivo',
          'Mantenimiento realizado' || case when new.passed then ' (aprobado)' else ' (NO aprobado)' end,
          jsonb_build_object('template_version_id', new.template_version_id),
          'maintenance_runs', new.id, true, new.executed_by,
          coalesce((select full_name from staff where id = new.executed_by), 'Sistema'));
  if new.plan_id is not null then
    update maintenance_plans
       set next_due_on = (new.executed_on + make_interval(months => interval_months))::date,
           updated_at = now()
     where id = new.plan_id;
  end if;
  return new;
end $$;
create trigger maintenance_runs_after after insert on maintenance_runs
  for each row execute function after_maintenance_run();

-- updated_at automático
create or replace function touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['staff','clients','sites','equipment','repair_orders','tickets',
                           'maintenance_templates','maintenance_plans','loans'] loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- Vista de preventivos con estado calculado (Vencido / por vencer / al día)
create view maintenance_status as
select p.*,
       case
         when p.next_due_on < (now() at time zone 'America/Argentina/Buenos_Aires')::date then 'vencido'
         when p.next_due_on <= (now() at time zone 'America/Argentina/Buenos_Aires')::date + 14 then 'por_vencer'
         else 'al_dia'
       end as due_state
from maintenance_plans p
where p.active;

-- ---------------------------------------------------------------
-- Ficha pública por QR: SOLO por función, con campos elegidos.
-- Nunca expone cliente intermediario, costos, remitos ni técnicos.
-- ---------------------------------------------------------------
create or replace function public_equipment_card(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', e.code,
    'type', e.equipment_type, 'brand', e.brand, 'model', e.model, 'serial', e.serial,
    'site', s.name, 'sector', e.sector,
    'status', e.status,
    'next_due_on', (select min(next_due_on) from maintenance_plans mp where mp.equipment_id = e.id and mp.active),
    'last_service_on', (select max(d) from (
        select max(executed_on) as d from maintenance_runs mr where mr.equipment_id = e.id
        union all
        select max(delivered_at) from repair_orders ro where ro.equipment_id = e.id and ro.status = 'entregado') x),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', h.created_at, 'type', h.type, 'summary', h.summary)
                                          order by h.created_at desc)
                         from (select * from history_entries h
                               where h.equipment_id = e.id and h.visible_on_qr
                               order by h.created_at desc limit 20) h), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'filename', a.filename))
                           from attachments a where a.equipment_id = e.id and a.public_on_qr), '[]'::jsonb)
  )
  from equipment e left join sites s on s.id = e.site_id
  where e.qr_token = p_token and e.status <> 'baja'
$$;

-- ---------------------------------------------------------------
-- Row level security: el personal activo ve y edita todo;
-- el público no toca tablas (solo public_equipment_card y la
-- ruta de reporte, que corre en el servidor).
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['staff','clients','sites','equipment','repair_orders','repair_parts','tickets',
                           'maintenance_templates','maintenance_template_versions','maintenance_plans',
                           'maintenance_runs','loans','attachments','history_entries'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy staff_read on %I for select to authenticated using (is_staff())', t);
  end loop;
  foreach t in array array['clients','sites','equipment','repair_orders','repair_parts','tickets',
                           'maintenance_plans','loans','attachments'] loop
    execute format('create policy staff_write on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- solo agregar en tablas inmutables
create policy staff_insert on history_entries for insert to authenticated with check (is_staff());
create policy staff_insert on maintenance_runs for insert to authenticated with check (is_staff() and executed_by = auth.uid());
create policy staff_insert on maintenance_template_versions for insert to authenticated with check (is_staff());
-- plantillas y usuarios: solo admin
create policy admin_write on maintenance_templates for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write on staff for all to authenticated using (is_admin()) with check (is_admin());

revoke all on all tables in schema public from anon;
grant execute on function public_equipment_card(text) to anon, authenticated;
