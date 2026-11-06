-- Presupuestos en PDF: se suben en la orden y quedan ligados también al equipo.
-- El archivo se guarda en la base, igual que las fotos. Solo agrega; se puede correr dos veces.

alter table attachments add column if not exists kind text not null default 'otro';
alter table attachments add column if not exists data bytea;
alter table attachments alter column path set default ('db:' || gen_random_uuid()::text);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attachments_kind_check') then
    alter table attachments add constraint attachments_kind_check check (kind in ('presupuesto', 'otro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'attachments_data_size') then
    alter table attachments add constraint attachments_data_size
      check (data is null or octet_length(data) <= 4000000);
  end if;
  -- un presupuesto nunca se muestra en la ficha pública del QR
  if not exists (select 1 from pg_constraint where conname = 'attachments_budget_private') then
    alter table attachments add constraint attachments_budget_private
      check (kind <> 'presupuesto' or public_on_qr = false);
  end if;
end $$;

create index if not exists attachments_order_kind_idx on attachments (repair_order_id, kind);
