# Registro de construcción

Prueba de punta a punta: `scripts/e2e` (Playwright) sobre Postgres 16 con la migración real · 37/37 OK, sin errores de consola, 390 px y 1440 px.

| pantalla | fecha | estado | qué falta | más difícil de lo esperado |
| --- | --- | --- | --- | --- |
| Base de la app (menú, tokens, capa de datos) | 2026-11-04 | listo | — | Next 16: Cache Components apagado (app privada, todo dinámico). Cada consulta corre como el usuario en una transacción para que RLS y la firma las aplique la base. |
| S01 Login | 2026-11-04 | listo | recuperar contraseña | — |
| S02 Panel | 2026-11-04 | parcial | vencidos y por vencer (esperan preventivos) | — |
| S03 Equipos | 2026-11-04 | listo | exportar | — |
| S04 Alta de equipo | 2026-11-04 | parcial | editar un equipo ya cargado | aviso de serial duplicado con enlace al existente |
| S06 Hoja de vida | 2026-11-04 | listo | adjuntos | los cambios de estado que provoca el taller no se duplican en el historial |
| S07 Etiqueta | 2026-11-04 | listo | hoja A4 de varias etiquetas | — |
| S08 Ficha QR | 2026-11-04 | listo | — | "último servicio" toma reparaciones entregadas además de preventivos |
| S09 Reportar falla | 2026-11-04 | parcial | formulario propio + tickets (etapa 3); hoy abre WhatsApp | — |
| S10 Taller (tablero) | 2026-11-04 | listo | — | — |
| S11 Ingreso / orden | 2026-11-04 | listo | repuestos por orden | React 19 reinicia los formularios al enviar: los selectores de estado tuvieron que pasar a no controlados |
| Preventivos, reportes, préstamos, clientes, informes | — | pendiente | etapas 2 a 5 de architecture.md | — |
