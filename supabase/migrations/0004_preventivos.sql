-- Preventivos, registro simple: fecha, resultado (apto / no apto), Nº de informe, próxima fecha
-- e informe en PDF. Sin checklist por ahora: usa una plantilla genérica "Preventivo".
-- Solo agrega o reemplaza funciones; se puede correr dos veces.

insert into maintenance_templates (id, name, kind)
values ('00000000-0000-4000-9000-000000000001', 'Preventivo', 'preventivo')
on conflict (id) do nothing;
insert into maintenance_template_versions (id, template_id, version, items)
values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-9000-000000000001', 1, '[]')
on conflict (id) do nothing;

alter table maintenance_runs add column if not exists report_number text;
create index if not exists maintenance_runs_report_idx on maintenance_runs (report_number);

-- informe en PDF del preventivo (misma tabla que los presupuestos)
alter table attachments add column if not exists maintenance_run_id uuid references maintenance_runs(id) on delete cascade;
create index if not exists attachments_run_idx on attachments (maintenance_run_id);
alter table attachments drop constraint if exists attachments_kind_check;
alter table attachments add constraint attachments_kind_check
  check (kind in ('presupuesto', 'informe_preventivo', 'otro'));

-- hoja de vida al registrar un preventivo (texto con "apto" y Nº de informe)
create or replace function after_maintenance_run() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into history_entries (equipment_id, type, summary, data, ref_table, ref_id, visible_on_qr, created_by, created_by_name)
  values (new.equipment_id, 'preventivo',
          'Preventivo realizado: ' || case when new.passed then 'apto' else 'NO apto' end
            || coalesce(' · informe Nº ' || new.report_number, ''),
          jsonb_build_object('template_version_id', new.template_version_id, 'executed_on', new.executed_on),
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

-- ficha pública: los documentos van con tipo y fecha, nunca con el nombre del archivo
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
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind,
                                                               'on', coalesce(mr.executed_on, a.created_at::date))
                                            order by coalesce(mr.executed_on, a.created_at::date) desc)
                           from attachments a left join maintenance_runs mr on mr.id = a.maintenance_run_id
                           where a.equipment_id = e.id and a.public_on_qr and a.kind <> 'presupuesto'
                             and a.data is not null), '[]'::jsonb)
  )
  from equipment e left join sites s on s.id = e.site_id
  where e.qr_token = p_token and e.status <> 'baja'
$$;

-- descarga pública de un documento marcado como visible para el cliente
create or replace function public_document(p_token text, p_id uuid)
returns table (kind text, executed_on date, data bytea)
language sql stable security definer set search_path = public as $$
  select a.kind, mr.executed_on, a.data
    from attachments a
    join equipment e on e.id = a.equipment_id
    left join maintenance_runs mr on mr.id = a.maintenance_run_id
   where e.qr_token = p_token and e.status <> 'baja' and a.id = p_id
     and a.public_on_qr and a.kind <> 'presupuesto' and a.data is not null
$$;
revoke all on function public_document(text, uuid) from public;
grant execute on function public_document(text, uuid) to anon, authenticated;
