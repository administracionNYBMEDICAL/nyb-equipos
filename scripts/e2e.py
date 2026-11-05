"""Recorre el corte vertical como un usuario: alta → ingreso → reparado → entregado → hoja de vida → etiqueta → QR."""
import re, sys
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3000"
import datetime, zoneinfo
TODAY = datetime.datetime.now(zoneinfo.ZoneInfo("America/Argentina/Buenos_Aires")).date()
TODAY_ISO, TODAY_AR = TODAY.isoformat(), TODAY.strftime("%d/%m/%Y")
SHOTS = "replica/clone-screens"
errors, results = [], []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("OK   " if cond else "FAIL ") + name)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=__import__("os").environ.get("CHROME_PATH") or None)
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.on("pageerror", lambda e: errors.append(str(e)))

    # Panel
    page.goto(BASE + "/")
    check("panel muestra 'En taller' = 4", page.locator("a[href='/taller']", has_text="En taller").first.inner_text().strip().endswith("4"))
    page.screenshot(path=f"{SHOTS}/S02-panel.png", full_page=True)

    # Validación: formulario vacío
    page.goto(BASE + "/equipos/nuevo")
    page.get_by_role("button", name="Guardar equipo").click()
    expect(page.get_by_text("Indicá el tipo de equipo")).to_be_visible()
    check("alta vacía muestra errores por campo", page.get_by_text("Indicá el cliente").is_visible())

    # Duplicado de serial (ya existe en la base de prueba)
    page.get_by_label("Tipo de equipo").fill("Humidificador")
    page.get_by_label("Marca").fill("fisher&paykel")
    page.get_by_label("Modelo").fill("mr850")
    page.get_by_label("Número de serie").fill("110725116269")
    page.get_by_label("Cliente (quién lo manda)").fill("Clínica Privada Monte Grande")
    page.get_by_role("button", name="Guardar equipo").click()
    expect(page.get_by_text("Este equipo ya está cargado.")).to_be_visible()
    check("serial duplicado avisa y ofrece abrir el existente", page.get_by_role("link", name=re.compile("Abrir NYB-")).is_visible())

    # Alta real con ingreso al taller a continuación (cliente nuevo + hospital nuevo)
    page.goto(BASE + "/equipos/nuevo")
    page.get_by_label("Tipo de equipo").fill("Respirador de Terapia")
    page.get_by_label("Marca").fill("Neumovent")
    page.get_by_label("Modelo").fill("Graph")
    page.get_by_label("Número de serie").fill("070410191070A1V")
    page.get_by_label("Cliente (quién lo manda)").fill("OFIUKO")
    page.get_by_label("Hospital o sanatorio").fill("Hospital Alende")
    page.get_by_label("Sector").fill("Pediatría")
    page.screenshot(path=f"{SHOTS}/S04-alta-equipo.png", full_page=True)
    page.get_by_role("button", name="Guardar equipo").click()
    page.wait_for_url(re.compile(r"/taller/nuevo\?equipo="))
    check("tras el alta va directo al ingreso", "Respirador de Terapia" in page.inner_text("h1"))

    page.get_by_label("Nº de remito de retiro").fill("39")
    page.get_by_label("Falla o motivo del ingreso").fill("Service 5.000 hs")
    page.get_by_label("Accesorios con los que entra").fill("Válvula exhalatoria y sistema celda de O2")
    page.screenshot(path=f"{SHOTS}/S11-nuevo-ingreso.png", full_page=True)
    page.get_by_role("button", name="Registrar ingreso").click()
    page.wait_for_url(re.compile(r"/taller/[0-9a-f-]{36}\?nueva=1"))
    number = re.search(r"OT-\d{4}-\d{4}", page.inner_text("body")).group(0)
    check(f"orden creada ({number}) con aviso", page.get_by_text(f"Ingreso registrado como {number}").is_visible())
    order_url = page.url.split("?")[0]

    # Segundo ingreso del mismo equipo: debe rechazarse
    eq_link = page.get_by_role("link", name=re.compile(r"NYB-\d{6}")).first
    eq_code = eq_link.inner_text()
    eq_link.click()
    page.wait_for_url(re.compile(r"/equipos/[0-9a-f-]{36}$"))
    eq_url = page.url
    check("equipo muestra 'Ver orden' (no permite otro ingreso)", page.get_by_role("link", name=f"Ver orden {number}").is_visible())

    # Avanzar la orden: reparado con presupuesto
    page.goto(order_url)
    page.get_by_label("Estado").select_option("reparado")
    page.get_by_label("Nº presupuesto").fill("202611041")
    page.get_by_label("Presupuesto ($)").fill("100.000")
    page.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_text("Orden guardada.")).to_be_visible()
    check("orden pasa a Reparado", True)

    # Entregado sin fecha → error; con fecha → ok
    page.reload()
    page.get_by_label("Estado").select_option("entregado")
    page.get_by_label("Fecha de salida").fill("")
    page.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_text("Para marcarlo entregado, cargá la fecha de salida.")).to_be_visible()
    check("entregado sin fecha se rechaza", True)
    page.get_by_label("Fecha de salida").fill(TODAY_ISO)
    page.get_by_label("Remito de entrega").fill("270")
    page.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_text("Orden guardada.")).to_be_visible()
    page.screenshot(path=f"{SHOTS}/S11-orden.png", full_page=True)

    # Hoja de vida
    page.goto(eq_url)
    body = page.inner_text("main")
    check("equipo vuelve a Operativo", "Operativo" in page.locator("main header").first.inner_text())
    for s in [f"Ingreso al taller {number}: Service 5.000 hs", f"{number}: En revisión → Reparado", f"{number}: Reparado → Entregado"]:
        check(f"hoja de vida: '{s}'", s in body)
    check("hoja de vida firmada 'por Juan Manuel Brahim'", "por Juan Manuel Brahim" in body)

    # Nota visible para el cliente
    page.get_by_label("Agregar una novedad").fill("Se reemplazó la celda de O2. La celda vieja se devolvió al cliente.")
    page.get_by_label("Que la vea el cliente al escanear el QR").check()
    page.get_by_role("button", name="Agregar a la hoja de vida").click()
    expect(page.get_by_text("Novedad agregada a la hoja de vida.")).to_be_visible()
    page.screenshot(path=f"{SHOTS}/S06-hoja-de-vida.png", full_page=True)

    # Etiqueta
    page.goto(eq_url + "/etiqueta")
    check("etiqueta con código y QR", page.get_by_label(f"Etiqueta del equipo {eq_code}").is_visible())
    page.screenshot(path=f"{SHOTS}/S07-etiqueta.png")
    page.pdf if False else None

    # Ficha pública, como cliente (contexto sin sesión equivale en local a ?vista=cliente)
    page.goto(eq_url)
    qr_href = page.get_by_role("link", name=re.compile("Ver lo que ve el cliente")).get_attribute("href")
    mob = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m = mob.new_page()
    m.on("console", lambda msg: msg.type == "error" and errors.append(msg.text))
    m.goto(BASE + qr_href)
    pub = m.inner_text("body")
    check("QR: muestra tipo, hospital y sector", "Respirador de Terapia" in pub and "Hospital Alende · Pediatría" in pub)
    check("QR: muestra la nota pública", "celda de O2" in pub)
    check("QR: último servicio = fecha de entrega", re.search(r"Último servicio\s+" + re.escape(TODAY_AR), pub) is not None)
    check("QR: sin entradas automáticas de estado", "Operativo → En taller" not in pub and "En taller → Operativo" not in pub)
    for secret in ["OFIUKO", "100.000", "202611041", "270", "Juan Manuel", "remito"]:
        check(f"QR: NO muestra '{secret}'", secret not in pub)
    check("QR: botón Reportar una falla a WhatsApp", "wa.me/5491162993838" in (m.get_by_role("link", name="Reportar una falla").get_attribute("href") or ""))
    check("QR: sin scroll horizontal a 390px", m.evaluate("document.documentElement.scrollWidth") <= 390)
    m.screenshot(path=f"{SHOTS}/S08-ficha-qr-celular.png", full_page=True)
    m.goto(BASE + "/q/tokeninexistente123")
    check("QR inválido: mensaje amable", "No encontramos este equipo" in m.inner_text("body"))

    # Celular: inventario y menú
    m.goto(BASE + "/equipos")
    check("inventario celular sin scroll horizontal", m.evaluate("document.documentElement.scrollWidth") <= 390)
    m.screenshot(path=f"{SHOTS}/S03-equipos-celular.png", full_page=True)
    m.get_by_role("button", name="Abrir menú").click()
    check("menú celular abre", m.get_by_role("dialog", name="Menú").is_visible())
    m.get_by_role("dialog").get_by_role("link", name="Taller").click()
    m.wait_for_url(BASE + "/taller")
    check("menú celular se cierra al navegar", m.get_by_role("dialog").count() == 0)
    m.screenshot(path=f"{SHOTS}/S10-taller-celular.png", full_page=True)

    # Escritorio: inventario, búsqueda, tablero
    page.goto(BASE + "/equipos?q=070410191070")
    check("búsqueda por serial encuentra 1", page.locator("tbody tr").count() == 1)
    page.goto(BASE + "/equipos?q=zzzz")
    check("búsqueda sin resultados: estado vacío", page.get_by_text("Ningún equipo coincide").is_visible())
    page.goto(BASE + "/equipos")
    page.screenshot(path=f"{SHOTS}/S03-equipos.png", full_page=True)
    page.goto(BASE + "/taller")
    page.screenshot(path=f"{SHOTS}/S10-taller.png", full_page=True)

    # Baja: sin motivo se rechaza; con motivo queda "Dado de baja" y el QR deja de mostrar la ficha
    page.goto(BASE + "/equipos?q=211240011082A1V")
    page.locator("tbody tr a").first.click()
    page.wait_for_url(re.compile(r"/equipos/[0-9a-f-]{36}$"))
    baja_url = page.url
    page.get_by_label("Estado del equipo").select_option("baja")
    page.get_by_role("button", name="Dar de baja").click()
    expect(page.get_by_text("Para dar de baja, escribí el motivo.")).to_be_visible()
    check("baja sin motivo se rechaza y conserva la selección", page.get_by_label("Estado del equipo").input_value() == "baja")
    page.get_by_label("Motivo de la baja").fill("Placa principal irreparable, sin repuesto")
    page.get_by_role("button", name="Dar de baja").click()
    expect(page.get_by_text("Estado actualizado.")).to_be_visible()
    page.reload()
    check("equipo queda Dado de baja", "Dado de baja" in page.locator("main header").first.inner_text())
    check("hoja de vida registra la baja con motivo", "Estado: Operativo → Dado de baja (Placa principal irreparable, sin repuesto)" in page.inner_text("main"))
    token_href = page.get_by_role("link", name=re.compile("Ver lo que ve el cliente")).get_attribute("href")
    page.goto(BASE + token_href)
    check("QR de equipo dado de baja no muestra la ficha", "No encontramos este equipo" in page.inner_text("body"))

    # ---------- Etapa 2: ficha con pestañas, editar, foto, cambiar QR, estado nuevo, gráfico ----------
    page.goto(eq_url + "/editar")
    page.get_by_text("Más datos (opcional)").click()
    page.get_by_label("Modelo").fill("Graph NEO")
    page.get_by_label("Condición").select_option("comodato")
    page.get_by_label("Clase de riesgo").select_option("Clase III")
    page.get_by_label("Garantía hasta").fill("2027-06-30")
    page.get_by_label("Fecha de fabricación").fill("2020-01-10")
    page.get_by_label("Fecha de compra").fill("2019-12-01")
    page.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_text("La compra no puede ser antes de la fabricación.")).to_be_visible()
    check("editar: valida compra anterior a fabricación y conserva lo escrito", page.get_by_label("Modelo").input_value() == "Graph NEO")
    page.get_by_label("Fecha de compra").fill("2020-03-01")
    page.get_by_role("button", name="Guardar cambios").click()
    page.wait_for_url(re.compile(r"tab=datos&guardado=1"))
    datos = page.inner_text("main")
    check("editar: datos guardados (comodato, clase III, garantía)", "En comodato" in datos and "Clase III" in datos and "30/06/2027" in datos)
    page.goto(eq_url + "?tab=actividad")
    act = page.inner_text("main")
    check("editar: actividad anota los campos cambiados", "Datos editados: modelo, condición, clasificación, fecha de fabricación, fecha de compra, garantía" in act)

    # Foto: se achica en el navegador antes de subir
    from PIL import Image
    big = "/tmp/claude-0/foto-prueba.png"
    import os; os.makedirs("/tmp/claude-0", exist_ok=True)
    Image.new("RGB", (3000, 2000), (40, 120, 140)).save(big)
    page.goto(eq_url + "?tab=datos")
    page.set_input_files("#photo-input", big)
    expect(page.get_by_text("Foto guardada.")).to_be_visible(timeout=15000)
    page.reload()
    w = page.evaluate("(() => { const i = document.querySelector('header img'); return i && i.complete ? i.naturalWidth : 0 })()")
    check(f"foto: se muestra y quedó achicada ({w}px de ancho)", 0 < w <= 1280)
    page.goto(eq_url)
    check("foto: anotada en la actividad", "Se agregó la foto del equipo" in page.inner_text("main"))
    anon = b.new_context()
    r = anon.request.get(eq_url.replace(BASE, BASE) + "/foto")
    # en modo local sin Supabase la sesión es fija, así que solo se verifica que responda imagen
    check("foto: la ruta devuelve una imagen", r.headers.get("content-type", "").startswith("image/"))
    anon.close()

    # Cambiar QR
    page.goto(eq_url)
    old_href = page.get_by_role("link", name=re.compile("Ver lo que ve el cliente")).get_attribute("href")
    page.get_by_text("Cambiar QR").click()
    page.get_by_role("button", name="Generar QR nuevo").click()
    expect(page.get_by_text("Marcá la casilla para confirmar.")).to_be_visible()
    check("cambiar QR: pide confirmación", True)
    if not page.get_by_label("Entiendo que la etiqueta pegada hoy deja de abrir la ficha").is_visible():
        page.get_by_text("Cambiar QR").click()
    page.get_by_label("Entiendo que la etiqueta pegada hoy deja de abrir la ficha").check()
    page.get_by_role("button", name="Generar QR nuevo").click()
    expect(page.get_by_text("Listo: imprimí la etiqueta nueva.")).to_be_visible()
    page.reload()
    new_href = page.get_by_role("link", name=re.compile("Ver lo que ve el cliente")).get_attribute("href")
    check("cambiar QR: el token cambió", new_href != old_href)
    page.goto(BASE + old_href)
    check("cambiar QR: la etiqueta vieja ya no abre la ficha", "No encontramos este equipo" in page.inner_text("body"))
    page.goto(BASE + new_href)
    check("cambiar QR: la nueva sí", "Respirador de Terapia" in page.inner_text("body"))
    page.goto(eq_url)
    check("cambiar QR: anotado en la actividad", "Se generó una etiqueta QR nueva" in page.inner_text("main"))

    # Estado nuevo del taller
    page.goto(BASE + "/taller")
    check("taller: columna Esperando repuesto", page.get_by_role("heading", name="Esperando repuesto").count() == 1)
    page.locator("a[href^='/taller/']").filter(has_text="Humidificador").first.click()
    page.wait_for_url(re.compile(r"/taller/[0-9a-f-]{36}$"))
    page.get_by_label("Estado", exact=True).select_option("esperando_repuesto")
    page.get_by_role("button", name="Guardar cambios").click()
    expect(page.get_by_text("Orden guardada.")).to_be_visible()
    page.goto(BASE + "/taller")
    col = page.get_by_role("region", name="Esperando repuesto").inner_text()
    check("taller: la orden pasó a Esperando repuesto", "Humidificador" in col)

    # Panel con gráfico
    page.goto(BASE + "/")
    check("panel: gráfico del estado de los equipos", page.get_by_role("img", name=re.compile(r"% de los equipos operativos")).is_visible())
    page.screenshot(path=f"{SHOTS}/S02-panel.png", full_page=True)
    page.goto(eq_url + "?tab=datos")
    page.screenshot(path=f"{SHOTS}/S06-ficha-datos.png", full_page=True)
    m.goto(eq_url)
    check("ficha celular sin scroll horizontal", m.evaluate("document.documentElement.scrollWidth") <= 390)
    m.screenshot(path=f"{SHOTS}/S06-ficha-celular.png", full_page=True)

    # Corregir la fecha de ingreso de una orden
    page.goto(BASE + "/taller")
    page.locator("a[href^='/taller/']").filter(has_text="Electrobisturí").first.click()
    page.wait_for_url(re.compile(r"/taller/[0-9a-f-]{36}$"))
    orden_url = page.url
    page.get_by_text("Corregir datos del ingreso").click()
    futura = (TODAY + datetime.timedelta(days=3)).isoformat()
    page.get_by_label("Fecha de ingreso").fill(futura)
    page.get_by_role("button", name="Guardar corrección").click()
    expect(page.get_by_text("La fecha de ingreso no puede ser posterior a hoy.")).to_be_visible()
    check("corregir ingreso: rechaza fecha futura", True)
    page.get_by_label("Fecha de ingreso").fill("2026-10-15")
    page.get_by_label("Nº de remito de retiro").fill("41")
    page.get_by_role("button", name="Guardar corrección").click()
    expect(page.get_by_text("Datos del ingreso corregidos.")).to_be_visible()
    body = page.inner_text("main")
    check("corregir ingreso: muestra la fecha nueva", "15/10/2026" in body)
    page.get_by_role("link", name=re.compile(r"NYB-\d{6}")).first.click()
    page.wait_for_url(re.compile(r"/equipos/[0-9a-f-]{36}"))
    check("corregir ingreso: anotado en la hoja de vida", re.search(r"se corrigió el ingreso \(fecha de ingreso 20/10/2026 → 15/10/2026, remito de retiro\)", page.inner_text("main")) is not None)

    # Teclado: llegar al botón principal con Tab
    page.goto(BASE + "/equipos/nuevo")
    page.keyboard.press("Tab")
    focused = page.evaluate("document.activeElement && document.activeElement.textContent")
    check("Tab mueve el foco (primer elemento enfocable)", bool(focused))

    b.close()

print("\nconsola:", errors or "sin errores")
fails = [n for n, ok in results if not ok]
print(f"{len(results) - len(fails)}/{len(results)} OK")
sys.exit(1 if fails or errors else 0)
