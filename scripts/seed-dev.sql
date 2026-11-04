-- Datos de prueba locales (tomados de la planilla de reparaciones).
insert into auth.users values ('00000000-0000-4000-8000-000000000001', 'administracion@nybmedical.com');
insert into auth.users values ('00000000-0000-4000-8000-000000000002', 'marcelo@example.com');
insert into staff (id, full_name, role) values
  ('00000000-0000-4000-8000-000000000001', 'Juan Manuel Brahim', 'admin'),
  ('00000000-0000-4000-8000-000000000002', 'Marcelo', 'tecnico');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002"}', false);

insert into clients (name) values ('OFIUKO'), ('Clínica Privada Monte Grande'), ('Sanatorio San Lucas S.A.'), ('IMPLATEL S.A.');
insert into sites (client_id, name) select id, 'Hospital Alende' from clients where name = 'OFIUKO';
insert into sites (client_id, name) select id, 'Hospital SARDA' from clients where name = 'OFIUKO';
insert into sites (client_id, name) select id, 'Clínica Privada Monte Grande' from clients where name = 'Clínica Privada Monte Grande';

insert into equipment (client_id, site_id, sector, equipment_type, brand, model, serial)
select c.id, s.id, 'Neo', 'Respirador de Terapia', 'Neumovent', 'Graphnet NEO', '211240011082A1V'
  from clients c join sites s on s.client_id = c.id and s.name = 'Hospital Alende';
insert into equipment (client_id, site_id, sector, equipment_type, brand, model, serial)
select c.id, s.id, 'Neo', 'Bomba Guía', 'Mindray', 'VP5', 'SK00713063'
  from clients c join sites s on s.client_id = c.id and s.name = 'Hospital SARDA';
insert into equipment (client_id, site_id, sector, equipment_type, brand, model, serial)
select c.id, s.id, 'Neonatología', 'Humidificador', 'Fisher&Paykel', 'MR850', '110725116269'
  from clients c join sites s on s.client_id = c.id where c.name = 'Clínica Privada Monte Grande';
insert into equipment (client_id, sector, equipment_type, brand, model, serial)
select id, 'Cirugía', 'Electrobisturí', 'EMED', 'ES350A', '361200' from clients where name = 'Sanatorio San Lucas S.A.';
insert into equipment (client_id, sector, equipment_type, brand, model, serial)
select id, 'Ambulancias', 'Respirador de Transporte', 'Leistung', 'PR4-g', 'G71028' from clients where name = 'IMPLATEL S.A.';

insert into repair_orders (equipment_id, client_id, received_at, reported_fault, accessories_in, technician_id, pickup_remito)
select id, client_id, '2026-10-10', 'Falta batería y flex', 'sin accesorios', '00000000-0000-4000-8000-000000000002', null from equipment where serial = 'SK00713063';
update repair_orders set status = 'en_reparacion' where reported_fault = 'Falta batería y flex';
insert into repair_orders (equipment_id, client_id, received_at, reported_fault, accessories_in, technician_id, pickup_remito)
select id, client_id, '2026-10-31', 'No calienta', 'Cable calentador y sensor de temperatura (2 cables)', '00000000-0000-4000-8000-000000000002', '38' from equipment where serial = '110725116269';
insert into repair_orders (equipment_id, client_id, received_at, reported_fault, accessories_in, technician_name, pickup_remito)
select id, client_id, '2026-10-20', 'No funciona', 'Pedalera, cable de línea, plancha, sonda argón', 'Sebastián', '37' from equipment where serial = '361200';
insert into repair_orders (equipment_id, client_id, received_at, reported_fault, technician_id)
select id, client_id, '2026-11-02', 'Service anual', '00000000-0000-4000-8000-000000000002' from equipment where serial = 'G71028';
update repair_orders set status = 'reparado' where reported_fault = 'Service anual';
update equipment set status = 'en_taller' where serial in ('SK00713063','110725116269','361200','G71028');
