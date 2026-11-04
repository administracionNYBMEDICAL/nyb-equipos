# Recon map: KIBBO (web app, responsive)

Scope: núcleo de gestión de equipos con QR — inventario, hoja de vida, reparaciones (órdenes de trabajo), preventivos con checklist y panel. Sin Comunidad, sin planes/facturación, sin multi-institución.
For: uso interno exclusivo de NYB Medical (confirmado 2026-11-04). No se vende. El "parque" son los equipos de clientes que NYB repara o mantiene, agrupados por cliente en lugar de por institución.
Account: Juan tiene acceso a un usuario de KIBBO; no se usa (términos: uso interno de la institución, prohibida la ingeniería inversa). Solo fuentes públicas.

### Cambios de alcance para NYB
- Institution -> Client (clínica, hospital, distribuidor). Building/Service pasan a ser la ubicación del equipo en el cliente.
- Una sola organización (NYB), sin límites por plan ni trial.
- Agregados propios de NYB (original = no): ingreso/egreso de equipo al taller, préstamo de equipos (loaners), repuestos cambiados y devueltos al cliente, certificado de seguridad eléctrica, importar la planilla "EQUIPAMIENTO EN REPARACIÓN - NYB".
Date: 2026-11-04
Method: solo fuentes públicas (marketing, planes, recursos, seguridad). No se usó ninguna cuenta ni se leyó código del sitio.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site (home) | https://kibbo.io | qué es, a quién apunta, funciones, planes resumidos |
| 2 | cómo funciona | https://kibbo.io/como-funciona | recorrido de 7 pasos, pantallas "Mis equipos", "Mantenimientos", columnas |
| 3 | planes | https://kibbo.io/planes | límites por plan (equipos, usuarios, edificios, GB), trial 60 días, FAQ |
| 4 | casos y red | https://kibbo.io/casos-y-red | testimonios de bioingeniería, módulo Comunidad |
| 5 | recurso: trazabilidad | https://kibbo.io/recursos/trazabilidad-equipos-medicos-hospital | campos del equipo, estados, tipos de historial, traslados y bajas |
| 6 | recurso: plan preventivo | https://kibbo.io/recursos/plan-mantenimiento-preventivo-equipos-medicos | periodicidad, plantillas checklist versionadas, alertas, informes |
| 7 | confianza y seguridad | https://kibbo.io/confianza-y-seguridad | HTTPS, cookies, CSRF, reCAPTCHA, AWS EE.UU., "solo equipos, no datos de salud" |
| 8 | términos | https://kibbo.io/terminos | prohíbe ingeniería inversa del software y uso fuera de la institución; ley argentina, tribunales de Córdoba |
| — | app store / videos / changelog / API pública | no encontrados | no hay listado en tiendas ni docs de API públicas; hay un video embebido en "casos y red" |

Nota de términos: si NYB tiene o abre una cuenta de KIBBO, su licencia es para uso interno de la institución y prohíbe ingeniería inversa. No usar esa cuenta para este proyecto. Este recon queda en fuentes públicas.

## Core loop

Una institución carga su parque con QR, y el sistema le dice qué equipo está operativo, qué preventivo vence y qué falla está abierta, dejando todo firmado en la hoja de vida de cada equipo.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login | app.kibbo.io/login | ingreso de usuarios de la institución | form email/clave, captcha invisible | filled, error (inferido) |
| S02 | Panel operativo (dashboard) | app.kibbo.io (home tras login) | estado del parque: operativos, vencidos, órdenes que requieren acción, por sector | stat tiles, gráficos de mantenimientos por período y % operativo | filled; empty (inferido, institución nueva) |
| S03 | Mis equipos (inventario) | menú | lista del parque, multimarca | tabla: serial, identificación, servicio, edificio, estado, última actividad; búsqueda/filtros (inferido) | filled; empty (inferido) |
| S04 | Alta / edición de equipo | desde S03 | cargar o editar un equipo, traslado (cambiar edificio/servicio), baja | form: marca, modelo, serial, UMDNS, servicio, edificio, estado, fecha fabricación, fecha compra, garantía, nº patrimonio, proveedor | filled, error de validación (inferido) |
| S05 | Importación masiva | desde S03 | cargar el parque por archivo | upload, mapeo de columnas (inferido), resumen de errores (inferido) | guess |
| S06 | Hoja de vida del equipo | desde S03 o por QR | ficha + historial | cabecera de ficha, badge de estado, alerta "Mantenimiento fuera de término", timeline de novedades/ubicación/OT/mantenimientos, próximo preventivo, descarga de datos | filled |
| S07 | Etiqueta QR | desde S04/S06 | imprimir sticker del equipo | QR + identificación | guess (layout) |
| S08 | Ficha pública/móvil por QR | escanear QR | ver hoja de vida y próximo preventivo desde el teléfono | ficha resumida, historial, botón reportar | filled, mobile |
| S09 | Reportar inconveniente (móvil) | desde S08 | cualquier persona con el QR reporta una falla | form corto: descripción, quién reporta | filled, enviado; sin límite de reportantes (términos) |
| S10 | Tickets / órdenes de trabajo | menú | gestionar fallas: quién reporta, quién atiende, estado de cada intervención | tabla/lista, detalle con intervenciones | filled |
| S11 | Detalle de OT | desde S10 o S06 | registrar intervenciones y cerrar | timeline de intervenciones, asignación, estado | guess (estados no publicados) |
| S12 | Mantenimientos | menú | lista de preventivos: equipo, serial, responsable, estado, fecha límite | tabla, badge "Vencido", export | filled |
| S13 | Ejecutar mantenimiento | desde S12 o S06 | completar el checklist y registrar ejecución | campos sí/no y numéricos, criterio de aceptación, firma/fecha; al guardar programa el siguiente | guess (layout) |
| S14 | Plantillas de preventivo | menú/config | crear plantillas checklist versionadas | editor de ítems (sí/no, numérico, criterio), historial de versiones y uso | guess (layout) |
| S15 | Proveedores | menú | directorio: empresa, provincia, localidad, equipos que atiende | tabla, form | filled |
| S16 | Informes | menú o dashboard | mantenimientos realizados, programados, vencidos; export | filtros por período, export | guess (layout) |
| S17 | Usuarios / institución / plan | config | usuarios (3–5 según plan), edificios, uso de almacenamiento | tablas, medidores de límite | guess |
| S18 | Comunidad | menú | preguntas entre ingenieros de distintas instituciones, respuesta marcada como solución | posts, respuestas, marcado | filled (captura descrita) — fuera de alcance |

## Flows

```
F01 Cargar un equipo y etiquetarlo
    S03 -> S04 (alta) -> S06 (hoja de vida) -> S07 (imprimir QR)
    happy path clicks: ~5 (inferido)
    edge: serial duplicado, sin proveedor, equipo de otra marca

F02 Importar el parque completo
    S03 -> S05 (subir archivo, mapear, confirmar) -> S03
    edge: columnas faltantes, filas con error, límite del plan superado

F03 Consultar un equipo por QR desde el celular
    escanear -> S08
    happy path clicks: 0-1
    edge: QR de equipo dado de baja, usuario sin sesión (vista pública vs. completa: guess)

F04 Reportar una falla desde el equipo
    escanear -> S08 -> S09 (enviar) -> ticket creado en S10 + novedad en S06
    happy path clicks: ~3
    edge: reportes duplicados del mismo equipo, reportante anónimo

F05 Atender una falla (ticket -> OT -> cierre)
    S10 -> S11 (asignar responsable, cargar intervenciones, cambiar estado) -> estado del equipo en S06
    edge: equipo pasa a "No operativo" / "Pendiente de gestionar"; se decide baja

F06 Programar y ejecutar un preventivo
    S14 (plantilla) -> S12 (programar con periodicidad y responsable) -> aviso previo -> S13 (completar checklist) -> siguiente programado automáticamente -> registro en S06
    edge: vence sin ejecutarse ("Vencido", "Mantenimiento fuera de término"), criterio de aceptación no cumplido, plantilla cambiada entre versiones

F07 Trasladar o dar de baja un equipo
    S06 -> S04 (cambiar edificio/servicio, o estado "Dado de baja" + motivo) -> historial de ubicación en S06

F08 Ver el estado del parque y exportar
    S02 -> S16 (filtrar período) -> export
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Data table | inventario, mantenimientos, tickets, proveedores | empty, filled, loading, filtered | S03 S10 S12 S15 |
| Status badge | Operativo, No operativo, Pendiente de gestionar, Dado de baja, Vencido | — | S03 S06 S12 |
| Stat tile / KPI | operativos, vencidos, OT abiertas | — | S02 |
| Chart | barras por período, proporción operativa | empty, filled | S02 S16 |
| Timeline / historial | novedad, ubicación, OT, mantenimiento (fecha, hora, usuario) | — | S06 S11 |
| Form | equipo, proveedor, reporte móvil, checklist | default, error, submitting, success | S04 S09 S13 S15 |
| Checklist item | sí/no, numérico, con criterio de aceptación | ok, fuera de criterio | S13 S14 |
| QR label | sticker imprimible | — | S07 |
| File upload | importación masiva | idle, parsing, errors, done | S05 |
| Alert banner | "Mantenimiento fuera de término", límite de plan | — | S06 S17 |
| Nav | lateral en escritorio, simplificada en móvil | — | todas |

## Inferred data model

```
Institution  id, name, tax_id (CUIT), plan (free|pro|enterprise), storage_used
             evidence: planes (límites por institución, verificación por identificación fiscal)
             confidence: high

Building     id, institution_id, name
             evidence: planes (edificios/sedes), S03 columna edificio
             confidence: high

Service      id, building_id?, name   (servicio/sector: UTI, quirófano...)
             evidence: S03 columna servicio, dashboard por sectores
             confidence: medium (si cuelga del edificio es guess)

User         id, institution_id, name, email, role
             evidence: planes (3/5 usuarios), firma de registros
             confidence: high (role es guess: no se publican roles)

Equipment    id, institution_id, brand, model, serial, umdns_code, asset_number (patrimonio),
             building_id, service_id, status (operativo|no_operativo|pendiente|baja),
             manufactured_at, purchased_at, warranty_until, supplier_id, qr_token, last_activity_at
             evidence: S03, S04, recurso trazabilidad
             confidence: high

HistoryEntry id, equipment_id, type (novedad|ubicacion|orden|mantenimiento|estado),
             body, created_at, created_by (firma), ref_id
             evidence: "fechado y firmado por quien lo cargó", tipos de historial
             confidence: high (append-only: guess, pero fuerte)

Ticket       id, equipment_id, reported_by (texto libre o usuario), description, created_at, status
             evidence: reporte por QR sin límite de personas, "quién reporta"
             confidence: medium

WorkOrder    id, ticket_id?, equipment_id, assignee_id, status, opened_at, closed_at
             evidence: "ticket con su orden de trabajo asociada", "quién la atiende"
             confidence: medium (estados no publicados: guess open|in_progress|waiting|closed)

Intervention id, work_order_id, by_user_id, notes, status, created_at
             evidence: "estado de cada intervención"
             confidence: medium

Supplier     id, institution_id?, company, province, locality
             relación n-n con Equipment
             evidence: S15, "vinculado a los equipos que atiende"
             confidence: high

MaintenanceTemplate      id, institution_id, name, version, items[], created_by
TemplateItem             id, template_id, label, kind (yes_no|numeric), min?, max?, required
             evidence: recurso preventivo (sí/no, numéricos, criterios, versionado, auditoría)
             confidence: high

MaintenancePlan  id, equipment_id, template_id, period (días/meses), responsible_id, due_at
MaintenanceRun   id, plan_id, template_version, executed_at, executed_by, answers (json), passed
             evidence: "al ejecutar, el sistema programa el siguiente", "Vencido"
             confidence: medium (separar plan/ejecución es diseño, no evidencia)

Attachment   id, equipment_id, file, size   (consume los GB del plan)
             evidence: límite de almacenamiento 50/200 GB
             confidence: guess
```

Relationships: Institution 1-n Building 1-n Service; Institution 1-n User, Equipment; Equipment 1-n HistoryEntry, Ticket, WorkOrder, MaintenancePlan; Ticket 1-1 WorkOrder; WorkOrder 1-n Intervention; MaintenancePlan 1-n MaintenanceRun; Supplier n-n Equipment.

## Feature matrix

See `features.csv`. Del original: must 15, should 11, could 3, skip 9. Agregados NYB: 5.

## Out of scope (cannot or should not be cloned)

- Plan gratuito atado a compras de equipos LEEX y verificación de seriales LEEX: es su acuerdo comercial, no una función.
- Comunidad entre instituciones: el valor es su red de usuarios, no el software. Se puede construir el foro, pero empieza vacío.
- Testimonios, nombres de hospitales clientes, recursos/artículos y textos del sitio: contenido de ellos.
- Carga inicial asistida con etiquetado QR en el hospital: es un servicio. NYB lo puede ofrecer con su propia gente, pero no se "clona".
- Marca KIBBO/LEEX, logo, colores y textos: se rebrandea en /replica-brand.

## Size

Screens 17 (sin Comunidad), flows 8, entities 14. Hard parts:
1. Hoja de vida inmutable y firmada (historial append-only con auditoría real).
2. Motor de preventivos: periodicidad, reprogramación automática, avisos previos y plantillas versionadas.
3. QR público con reporte anónimo seguro (sin exponer el resto del parque, anti-spam).
También: importación masiva con validación, multi-institución con límites por plan.

Size: M (unas semanas para un MVP usable por una clínica). L si se suma API pública, informes avanzados y facturación por plan.
