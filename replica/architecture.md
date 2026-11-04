# Arquitectura: plataforma de equipos con QR (uso interno de NYB Medical)

Fecha: 2026-11-04 · Lee: `recon.md`, `features.csv`, planilla "EQUIPAMIENTO EN REPARACIÓN - NYB" · Esquema: `schema.sql`, probado en Postgres 16

## Decisiones tomadas con Juan

- Uso exclusivo de NYB; no se vende. 2 a 5 usuarios internos.
- El QR lo escanean NYB **y el cliente**. El técnico logueado ve todo; el cliente ve una ficha reducida y puede reportar una falla.
- Se importa la planilla actual como punto de partida.
- App web propia con base de datos propia, en un subdominio de nybmedical.com.

## Lo que mostró la planilla (y cambia el modelo)

- **Cliente ≠ lugar.** "OFIUKO" es quien manda los equipos, pero el equipo está en "Hospital Alende - Neo" o "Hospital SARDA - Neo". El modelo separa `clients` (quién manda / paga) de `sites` (hospital) y `sector` (Neo, Pediatría, Cirugía).
- **Equipo ≠ ingreso.** Un mismo respirador entra varias veces al taller. Por eso hay `equipment` (identidad permanente, con su QR) y `repair_orders` (cada ingreso: remitos, presupuesto, estado, técnico, costo).
- **El serial a veces falta** ("sin numero" o vacío). La identidad es el QR, no el serial.
- **Estados reales del taller:** EN REVISION → PRESUPUESTADO → EN REPARACION → REPARADO → ENTREGADO, más FALTANTE. Agrego `sin_reparacion` para equipos que vuelven sin arreglar.
- **Préstamos y repuestos** aparecen en los comentarios ("está en préstamo a un cliente", "partes faltantes"). Pasan a tener su propia tabla.

## Stack

| capa | elección | por qué |
| --- | --- | --- |
| app web | Next.js (App Router) + TypeScript | una sola app para el panel interno y la ficha pública del QR |
| estilos | Tailwind, tokens de `/replica-design` | rápido de ajustar a la marca NYB |
| móvil | la misma web, responsive | el QR abre el navegador del celular; no hace falta app de tienda |
| base de datos | Postgres en Supabase | administrada, con row level security; un solo lugar para todo |
| auth | Supabase Auth (email + contraseña o link mágico) | 2 a 5 usuarios; no todos los técnicos tienen cuenta de Workspace |
| archivos | Supabase Storage | fotos, manuales y certificados de seguridad eléctrica |
| email | Resend, enviando desde nybmedical.com | aviso de preventivos por vencer y de reportes nuevos |
| tareas programadas | Vercel Cron (1 por día) | resumen diario de vencimientos |
| hosting | Vercel | deploy simple; dominio `equipos.nybmedical.com` |
| anti-spam | Cloudflare Turnstile en el formulario público | el reporte por QR no pide cuenta |
| PDF / etiquetas | `qrcode` + generación de PDF en el servidor | hojas de etiquetas para imprimir |

Sin microservicios, sin pagos: no hay facturación porque es una herramienta interna.
Plan: Supabase en plan pago (backups diarios; el plan gratis pausa proyectos inactivos y no conviene para datos del taller). Verificar precios al momento de contratar.

## Esquema

14 tablas + 1 vista + 1 función pública. Detalle completo en `schema.sql`.

| tabla | qué guarda |
| --- | --- |
| `staff` | usuarios NYB, rol `admin` o `tecnico` |
| `clients` | quién envía / paga (OFIUKO, Clínica Privada Monte Grande, IMPLATEL...) |
| `sites` | hospital o sanatorio donde está el equipo, de cada cliente |
| `equipment` | equipo: tipo, marca, modelo, serial (opcional), UMDNS, patrimonio, sector, estado, `qr_token`, código `NYB-000123`; `owner = nyb` para equipos de préstamo |
| `repair_orders` | cada ingreso al taller: `OT-2026-0001`, fechas, remitos de retiro y entrega, accesorios, falla, estado, técnico, presupuesto, costo |
| `repair_parts` | repuestos por orden y qué se hizo con el reemplazado (devuelto / descartado) |
| `tickets` | reportes de falla del cliente por QR |
| `maintenance_templates` + `_versions` | checklists versionados (sí/no y numéricos con mínimo/máximo); tipo preventivo, seguridad eléctrica o calibración |
| `maintenance_plans` | qué equipo, qué plantilla, cada cuántos meses, responsable, próxima fecha |
| `maintenance_runs` | cada ejecución: respuestas, aprobado o no, certificado PDF |
| `loans` | préstamos de equipos NYB a clientes, ligados a la orden que los motivó |
| `attachments` | archivos; `public_on_qr` decide si el cliente los ve |
| `history_entries` | **hoja de vida**: solo se agrega, nunca se edita ni borra; fecha, tipo, firma |
| vista `maintenance_status` | `vencido` / `por_vencer` (14 días) / `al_dia`, con hora de Argentina |

Reglas que viven en la base, no en la pantalla (todas probadas):

1. Mismo marca + modelo + serial no se carga dos veces (sin distinguir mayúsculas). Equipos sin serial se permiten.
2. Un equipo no puede tener dos ingresos abiertos a la vez.
3. No se puede marcar "entregado" sin fecha de salida, ni con salida anterior al ingreso.
4. Altas, cambios de estado, de ubicación, ingresos, egresos y preventivos se anotan solos en la hoja de vida, con el nombre de quien lo hizo.
5. La hoja de vida rechaza `update`, `delete` y `truncate`.
6. Al registrar un preventivo, la próxima fecha se recalcula sola (fecha de ejecución + intervalo).
7. Acceso: el personal activo ve y edita todo; plantillas y usuarios solo el admin. Un usuario logueado que no es del personal ve 0 filas. El público no lee ninguna tabla.

## La ficha pública del QR

URL impresa en la etiqueta: `https://equipos.nybmedical.com/q/<qr_token>`. El token tiene 12 caracteres al azar, no es adivinable ni secuencial y **nunca cambia**, porque la etiqueta queda pegada años.

El cliente ve, a través de `public_equipment_card()`: tipo, marca, modelo, serial, hospital, sector, estado, último servicio, próximo preventivo, las últimas 20 entradas marcadas como visibles y los documentos marcados como públicos.

**Nunca** ve: el cliente intermediario (OFIUKO), costos, presupuestos, remitos, técnicos ni comentarios internos.

Si el que escanea está logueado como personal NYB, la misma URL redirige a la ficha completa con todas las acciones.

## Rutas

| método · ruta | qué hace | quién | flujo |
| --- | --- | --- | --- |
| GET `/login` | ingreso | público | — |
| GET `/` | panel: en taller por estado, preventivos vencidos y por vencer, reportes nuevos, préstamos afuera | personal | F08 |
| GET `/equipos` | inventario con búsqueda (serial, código, marca, modelo) y filtros (cliente, sitio, tipo, estado) | personal | F01 |
| GET/POST `/equipos/nuevo` | alta de equipo | personal | F01 |
| GET `/equipos/[id]` | hoja de vida completa + acciones | personal | F01 F05 F07 |
| POST `/equipos/[id]` (acciones) | editar, trasladar, dar de baja (con motivo), agregar nota | personal | F07 |
| GET `/equipos/[id]/etiqueta` | PDF de la etiqueta QR | personal | F01 |
| POST `/etiquetas` | PDF de una hoja de etiquetas para varios equipos | personal | F01 |
| GET `/taller` | órdenes abiertas en tablero por estado (como la planilla, pero por columnas) | personal | F05 |
| GET/POST `/taller/nuevo` | ingreso: buscar el equipo o darlo de alta en el momento, remito, accesorios, falla | personal | F05 |
| GET `/taller/[id]` | detalle de la orden: estado, presupuesto, repuestos, técnico, egreso | personal | F05 |
| POST `/taller/[id]/estado` | cambiar estado (anota en la hoja de vida) | personal | F05 |
| GET `/preventivos` | lista con Vencido / Por vencer / Al día, filtro por responsable y cliente; exportar CSV | personal | F06 |
| GET/POST `/preventivos/[planId]/ejecutar` | completar el checklist; marca fuera de rango; sube certificado | personal | F06 |
| GET/POST `/plantillas` | crear y versionar checklists | admin | F06 |
| GET `/prestamos` | equipos NYB prestados, a quién, desde cuándo | personal | — |
| GET `/clientes`, `/clientes/[id]` | clientes, sus sitios y su parque | personal | — |
| GET `/reportes` | tickets del QR; convertir en orden o descartar | personal | F04 |
| GET `/informes` | órdenes y preventivos por período, por cliente; exportar | personal | F08 |
| GET `/q/[token]` | ficha pública del equipo | público | F03 |
| POST `/q/[token]/reportar` | crea un ticket (Turnstile + límite por IP y por equipo) | público | F04 |
| POST `/admin/importar` | importar la planilla (vista previa → confirmar) | admin | — |
| GET `/admin/usuarios` | alta y baja de usuarios | admin | — |

Tareas programadas: **todos los días a las 7:45 (Argentina)**, un email a cada responsable con sus preventivos vencidos y por vencer, y al admin con los reportes de QR sin atender. Avisos inmediatos: reporte nuevo por QR → email al admin.

Integraciones: ninguna con KIBBO ni con APIs privadas. Solo Supabase, Resend, Turnstile y Vercel con cuentas de NYB.

## Importación de la planilla

| columna de la planilla | destino |
| --- | --- |
| Tipo Equipo, Marca, Modelo, NRO. Serie | `equipment` (se agrupan filas con el mismo marca + modelo + serial en un solo equipo) |
| Cliente | `clients` |
| Servicio ("Hospital Alende - Neo") | `sites` = "Hospital Alende", `sector` = "Neo" si hay " - "; si es solo un sector ("Neonatologia"), sitio = el cliente |
| Fecha de Ingreso, NRO. Remito Retiro, Accesorios, Falla / Desperfecto | `repair_orders` |
| Estado | `status` (EN REVISION → en_revision, etc.) |
| NRO. Presupuesto, Fecha de Presupuesto | `budget_number`, `budget_date` ("OK" en NRO. Presupuesto queda como comentario) |
| Comentarios | `comments`; si dice "préstamo" se marca para revisar |
| Fecha de Salida, NRO. Remito Entrega | `delivered_at`, `delivery_remito` ("sin remito" → vacío + comentario) |
| Técnico | `technician_name`, y `technician_id` si coincide con un usuario |
| Costo ("$ 100.000,00") | `cost_cents` = 10000000, ARS |

Fechas en formato día/mes/año. Las órdenes importadas llevan `source = 'planilla'`. Antes de grabar se muestra una vista previa con lo que no cierra: seriales vacíos, filas "ENTREGADO" sin fecha de salida, equipos repetidos con dos ingresos abiertos.

## Lo que puede fallar

- **Etiquetas QR permanentes.** Si cambia el dominio, las etiquetas pegadas dejan de servir. El dominio `nybmedical.com` tiene que mantenerse renovado, y la ruta `/q/` no se cambia nunca.
- **Clientes intermediarios.** Si el hospital escanea un equipo que mandó OFIUKO y ve "NYB Medical" en la ficha, se entera de quién lo repara. Hay que decidir si eso está bien con cada intermediario. Se puede ocultar la marca NYB por cliente si hace falta.
- **Spam en el formulario público.** Turnstile, límite de 5 reportes por hora por IP y por equipo, y la IP se guarda solo como hash.
- **Señal en el hospital.** En subsuelos o quirófanos puede no haber señal. La ficha pública tiene que ser liviana (sin imágenes pesadas) y cargar rápido con 3G.
- **Zona horaria.** Se guarda en UTC y se muestra en hora de Argentina. "Vencido" se calcula con la fecha argentina, no la del servidor.
- **Números con huecos.** Si un alta falla, ese código `NYB-` o `OT-` se pierde. Es normal, no es un error.
- **Datos de salud.** No se guarda nada de pacientes: solo equipos. Igual conviene backups diarios y no compartir el acceso de admin.
- **Archivos.** Máximo 25 MB por archivo; fotos se comprimen al subir.

## Orden de construcción

1. **Corte vertical (lo mínimo de punta a punta).** Login, alta de equipo, etiqueta QR, ficha pública, ingreso al taller y cambio de estado, con la hoja de vida anotándose sola.
   Pantallas S01 S03 S04 S06 S07 S08 · tablas `staff clients sites equipment repair_orders history_entries` · rutas `/login /equipos /equipos/nuevo /equipos/[id] /equipos/[id]/etiqueta /taller/nuevo /taller/[id] /q/[token]`.
2. **Taller completo + importación.** Tablero por estado, presupuesto, repuestos, egreso con remito, importar la planilla, panel.
   S02 S05 S10 S11 · `repair_parts` · `/taller /admin/importar /`.
3. **Reportes del cliente por QR.** Formulario público, tickets, email al admin, convertir en orden.
   S09 · `tickets` · `/q/[token]/reportar /reportes`.
4. **Preventivos.** Plantillas versionadas, planes, ejecución con checklist, seguridad eléctrica con certificado, emails diarios.
   S12 S13 S14 · `maintenance_*` · `/preventivos /plantillas`, cron.
5. **Préstamos, adjuntos, informes y exportación.** S15 S16 · `loans attachments` · `/prestamos /informes`.
6. **Arreglos de `/replica-entrepreneur`**, cuando corra.

## Resumen

- Stack: Next.js + Supabase (Postgres, Auth, Storage) + Resend + Vercel, en `equipos.nybmedical.com`.
- 14 tablas, 23 rutas y 1 tarea diaria.
- Lo más riesgoso: que las etiquetas QR sigan funcionando por años, qué ve el hospital cuando el equipo vino por un intermediario, y limpiar bien la planilla al importarla.
- Siguiente paso: `/replica-design`.
