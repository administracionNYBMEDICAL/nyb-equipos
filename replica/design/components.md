# Componentes · plataforma de equipos NYB Medical

Base: shadcn/ui (Radix) + Tailwind con `tokens.css`. Íconos: Lucide (MIT). Fuente: IBM Plex Sans / Plex Mono (OFL).
Logo: el sticker de NYB Medical (activo propio). Todo texto de la interfaz, en español rioplatense.
Regla de estados: el color nunca va solo. Cada badge lleva su texto, y los vencidos llevan además un ícono.

## Identidad aplicada

- **Navy `brand`** como en el sticker: barra lateral, encabezado de la ficha QR, botón principal.
- **Teal `accent`** solo sobre navy (ítem activo del menú, línea de ECG, botón de escanear). Sobre blanco, usar siempre `accent-strong` (#2a7a7c), porque el teal claro no llega a 4.5:1 sobre blanco.
- **Línea de ECG** del sticker como único adorno: separador bajo el encabezado del panel y de la ficha QR. Es un SVG propio y fino; no se repite en otros lugares.
- **Celeste** de la bandera solo como detalle (la banderita al pie de la ficha QR y de la etiqueta). Nunca para texto chico.
- **Eyebrow** en mayúsculas espaciadas (eco de "MEDICAL") para rótulos de sección: "EQUIPO", "HOJA DE VIDA", "TALLER".

## Componentes

```
AppShell
  layout    sidebar 248px navy (bg brand) + contenido max 1200px sobre bg
            en móvil (<768): barra superior navy 56px + menú en hoja desde abajo
  sidebar   logo arriba, nav, usuario abajo; ítem activo: barra izq 3px accent + texto on-brand;
            inactivo: brand-muted; hover: bg brand-hover
  nav       Panel, Equipos, Taller, Preventivos, Reportes QR (con contador), Préstamos, Clientes, Informes
  a11y      <nav aria-label="Principal">, aria-current="page" en el activo
  used on   todas menos S08 S09

Button
  variants  primary (bg brand, text on-brand), accent (bg accent, text on-accent: "Escanear", "Imprimir QR"),
            secondary (bg bg, border border, text text), ghost, danger (bg danger, text white)
  sizes     sm 32px, md 40px, lg 48px (lg en móvil y ficha QR: tap-min 44)
  states    default, hover (brand-hover / 6% más oscuro), active, focus-visible (anillo 2px focus + 2px offset),
            disabled (50% opacidad, cursor not-allowed), loading (spinner + label conservado)
  tokens    radius md, font sm/600
  a11y      <button> real; loading con aria-busy; danger confirma con diálogo
  used on   todas

StatusBadge
  variants  equipment.*, repair.*, maintenance.* (ver tokens.json → status)
  anatomy   pill, punto de 6px del color fg + texto; xs/600; padding 2px 8px
  states    — (estático); vencido suma ícono AlertTriangle
  a11y      el texto es el estado; nada se comunica solo por color
  used on   S02 S03 S06 S08 S10 S11 S12

Input / Select / Textarea / DatePicker
  sizes     md 40px (escritorio), lg 48px (móvil)
  states    default (border border-input), focus (anillo focus), error (border danger + mensaje danger debajo),
            disabled (bg surface), readonly
  extras    Serial y códigos en font mono; fecha en formato dd/mm/aaaa; moneda con "$" y separador de miles argentino
  a11y      <label> visible siempre; error con aria-describedby
  used on   S04 S09 S11 S13 S14 S15

Combobox (buscar o crear)
  uso       elegir cliente / sitio / equipo al dar un ingreso; "Crear 'Hospital X'" como última opción
  states    vacío, buscando, sin resultados (+ crear), seleccionado
  a11y      Radix Combobox / cmdk, navegable con flechas
  used on   S04 S11 (ingreso al taller)

DataTable
  variants  equipos, órdenes, preventivos, reportes, préstamos
  anatomy   barra de filtros (búsqueda + chips de filtro) · tabla · paginado; encabezado sticky bg surface
  states    loading (skeleton 6 filas), empty (texto + acción: "Todavía no hay equipos. Cargá el primero o importá la planilla"),
            filtrado sin resultados ("Ningún equipo coincide" + Limpiar filtros), filled, error (reintentar)
  móvil     se convierte en lista de tarjetas (código, tipo, marca/modelo, badge)
  a11y      <table> real con <th scope>; filas clicables con enlace en la primera celda
  used on   S03 S10 S12 S15 S16

KanbanBoard (taller)
  columnas  En revisión · Presupuestado · En reparación · Reparado (listo para entregar)
  card      OT-2026-0001 mono, tipo + marca/modelo, cliente / sitio, días en taller (warning si > 15), técnico
  states    columna vacía, arrastrando, soltar no permitido
  a11y      mover también con menú "Cambiar estado" (no depender del arrastre)
  used on   S10

StatTile
  anatomy   eyebrow + número xl + delta o enlace "Ver"
  variants  neutral, danger (vencidos), warning (por vencer), info (en taller)
  used on   S02

Timeline (hoja de vida)
  item      ícono por tipo (Lucide: LogIn ingreso, LogOut egreso, Wrench orden, ClipboardCheck preventivo,
            MapPin ubicación, MessageSquareWarning reporte QR, Archive baja), resumen, fecha dd/mm/aaaa hh:mm,
            firma ("por Marcelo") en text-muted
  states    vacío ("Sin movimientos todavía"), cargar más
  regla     no hay botón editar ni borrar: es de solo agregado; correcciones como nota nueva
  used on   S06 S08 S11

QrLabel (etiqueta imprimible)
  tamaño    50 × 30 mm (térmica) y hoja A4 de 3 × 8
  anatomy   QR a la izquierda (corrección de error M, zona quieta 2 módulos), a la derecha: NYB MEDICAL,
            código NYB-000123 en mono grande, tipo de equipo, tel. de NYB; banderita celeste abajo
  colores   QR negro puro sobre blanco (los colores de marca bajan la lectura en impresoras térmicas)
  used on   S07

QrPublicCard (ficha del equipo al escanear)
  layout    max 480px, una columna; encabezado navy con logo chico + línea ECG; luego:
            tipo / marca / modelo, serial mono, hospital y sector, badge de estado,
            "Último servicio" y "Próximo preventivo" (con badge al día / por vencer / vencido),
            botón lg accent "Reportar una falla", historial visible (20), documentos públicos
  states    válido, equipo en taller ("Este equipo está en el taller de NYB"), token inválido ("No encontramos este equipo"),
            sesión NYB activa → enlace "Ver ficha completa"
  rendimiento  sin imágenes salvo el logo SVG; < 50 KB; legible con señal mala
  used on   S08

ReportForm (falla desde el QR)
  campos    Tu nombre, Contacto (teléfono o email, opcional), ¿Qué le pasa al equipo?
  states    enviando, enviado ("Recibimos tu reporte. NYB Medical se va a comunicar."), error, límite alcanzado
  a11y      Turnstile invisible; un solo paso
  used on   S09

ChecklistItem (preventivo)
  variants  sí / no (toggle de 2 botones grandes), numérico (input + unidad + rango esperado)
  states    sin responder, ok, fuera de rango (danger-soft + "Fuera de rango: 0–50 mL")
  used on   S13 S14

Dialog, Sheet, Toast, Tabs, Tooltip, Skeleton
  base      shadcn/ui con tokens; Toast abajo-centro en móvil, abajo-derecha en escritorio
  toast     éxito (success), error (danger, persiste hasta cerrar)
```

## Pendiente para /replica-build

- Construir los primitivos en una ruta `/design` antes de las pantallas y sacarle captura.
- Modo oscuro: no por ahora. Es una herramienta interna de taller y la ficha QR se ve en blanco.
