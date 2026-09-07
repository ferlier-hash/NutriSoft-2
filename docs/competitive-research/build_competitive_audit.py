from pathlib import Path
from datetime import date

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path("/Users/fernandoliernur/Projects/nutrisoft")
RESEARCH = ROOT / "docs" / "competitive-research"
SHOTS = RESEARCH / "screenshots"
OUT = ROOT / "docs" / "Informe_competitivo_NutriSoft_2026-08-12.docx"

BLUE = "2E74B5"
DARK = "15304A"
TEAL = "2B7A78"
LIGHT = "E8EEF5"
PALE = "F5F8FB"
GREEN = "E8F4EE"
AMBER = "FFF3D6"
RED = "FCE8E6"
GRAY = "5F6F7F"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, start=120, bottom=80, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("NutriSoft · Inteligencia competitiva  |  ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(GRAY)
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)


def configure_document(doc):
    sec = doc.sections[0]
    sec.page_width = Inches(8.5)
    sec.page_height = Inches(11)
    sec.top_margin = Inches(0.75)
    sec.bottom_margin = Inches(0.72)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)
    sec.header_distance = Inches(0.35)
    sec.footer_distance = Inches(0.35)

    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(DARK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.12

    for name, size, color, before, after in (
        ("Title", 30, DARK, 0, 10),
        ("Subtitle", 13, GRAY, 0, 8),
        ("Heading 1", 18, BLUE, 16, 8),
        ("Heading 2", 14, DARK, 12, 6),
        ("Heading 3", 11.5, TEAL, 9, 4),
    ):
        style = doc.styles[name]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.color.rgb = RGBColor.from_string(color)
        style.font.bold = name != "Subtitle"
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    for sec in doc.sections:
        add_page_number(sec.footer.paragraphs[0])


def add_run(p, text, bold=False, color=None, italic=False, size=None):
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    if size:
        r.font.size = Pt(size)
    return r


def para(doc, text="", bold_lead=None, style=None, align=None):
    p = doc.add_paragraph(style=style)
    if align is not None:
        p.alignment = align
    if bold_lead and text.startswith(bold_lead):
        add_run(p, bold_lead, bold=True)
        add_run(p, text[len(bold_lead):])
    else:
        add_run(p, text)
    return p


def bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.paragraph_format.left_indent = Inches(0.22 + level * 0.2)
    p.paragraph_format.first_line_indent = Inches(-0.12)
    p.paragraph_format.space_after = Pt(3)
    add_run(p, text)
    return p


def callout(doc, title, body, fill=LIGHT, accent=BLUE):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.85)
    cell = table.cell(0, 0)
    tr_pr = table.rows[0]._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)
    set_cell_shading(cell, fill)
    set_cell_margins(cell, top=120, start=170, bottom=120, end=170)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    add_run(p, title, bold=True, color=accent)
    p2 = cell.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    add_run(p2, body)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_table(doc, headers, rows, widths=None, small=True):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        set_cell_shading(hdr.cells[i], LIGHT)
        set_cell_margins(hdr.cells[i])
        hdr.cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = hdr.cells[i].paragraphs[0]
        add_run(p, h, bold=True, color=DARK, size=8.5 if small else 9.5)
        if widths:
            hdr.cells[i].width = Inches(widths[i])
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            set_cell_margins(cells[i])
            if widths:
                cells[i].width = Inches(widths[i])
            p = cells[i].paragraphs[0]
            add_run(p, str(value), size=8.2 if small else 9.2)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def image(doc, filename, caption, width=6.75):
    path = SHOTS / filename
    if not path.exists():
        callout(doc, "Captura no disponible", f"No se encontró el archivo {filename}.", RED)
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(path), width=Inches(width))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(8)
    r = cap.add_run(caption)
    r.italic = True
    r.font.size = Pt(8)
    r.font.color.rgb = RGBColor.from_string(GRAY)


def page_break(doc):
    # Section headings and keep-with-next rules provide a denser reference guide.
    # Explicit breaks after image-heavy profiles can otherwise create blank pages.
    return None


def add_toc(doc):
    p = doc.add_paragraph()
    run = p.add_run()
    fld_char = OxmlElement("w:fldChar")
    fld_char.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = 'TOC \\o "1-3" \\h \\z \\u'
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:t")
    placeholder.text = "Abrí el documento en Word y elegí Actualizar tabla para regenerar este índice."
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([fld_char, instr, separate, placeholder, end])


def profile(doc, name, subtitle, evidence, observed, modules, strengths, cautions, adaptation, shot=None):
    doc.add_heading(name, 1)
    para(doc, subtitle, style="Subtitle")
    callout(doc, "Nivel de evidencia", evidence, PALE, TEAL)
    doc.add_heading("Lectura estratégica", 2)
    para(doc, observed)
    doc.add_heading("Arquitectura y funciones observadas", 2)
    for title, detail in modules:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        add_run(p, title + ". ", bold=True, color=DARK)
        add_run(p, detail)
    if shot:
        image(doc, shot[0], shot[1])
    doc.add_heading("Qué hace bien", 2)
    for x in strengths:
        bullet(doc, x)
    doc.add_heading("Riesgos o límites detectados", 2)
    for x in cautions:
        bullet(doc, x)
    callout(doc, "Aplicación recomendada en NutriSoft", adaptation, GREEN, TEAL)


def blueprint(doc, n, title, value, refs, flow, data, permissions, edge, phases, acceptance, ai=None):
    doc.add_heading(f"{n}. {title}", 2)
    p = doc.add_paragraph()
    add_run(p, "Problema y valor. ", bold=True)
    add_run(p, value)
    p = doc.add_paragraph()
    add_run(p, "Referencias observadas. ", bold=True)
    add_run(p, refs)
    doc.add_heading("Flujo recomendado", 3)
    for step in flow:
        bullet(doc, step)
    p = doc.add_paragraph()
    add_run(p, "Datos mínimos. ", bold=True)
    add_run(p, data)
    p = doc.add_paragraph()
    add_run(p, "Permisos y seguridad. ", bold=True)
    add_run(p, permissions)
    if ai:
        p = doc.add_paragraph()
        add_run(p, "Papel de la IA. ", bold=True)
        add_run(p, ai)
    p = doc.add_paragraph()
    add_run(p, "Estados límite. ", bold=True)
    add_run(p, edge)
    p = doc.add_paragraph()
    add_run(p, "Entrega por fases. ", bold=True)
    add_run(p, phases)
    p = doc.add_paragraph()
    add_run(p, "Criterios de aceptación. ", bold=True, color=TEAL)
    add_run(p, acceptance)


def build():
    doc = Document()
    configure_document(doc)
    props = doc.core_properties
    props.title = "Radar competitivo y consultor de ideas para NutriSoft"
    props.subject = "Auditoría funcional y UX de nueve plataformas competidoras"
    props.author = "NutriSoft · Investigación asistida por Codex"
    props.keywords = "NutriSoft, nutrición, SaaS, benchmarking, UX, IA"

    # Cover
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(70)
    add_run(p, "NUTRISOFT", bold=True, color=TEAL, size=14)
    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_run(p, "Radar competitivo\ny consultor de ideas", bold=True, color=DARK, size=30)
    para(doc, "Auditoría funcional, de producto y experiencia de nueve plataformas del sector", style="Subtitle")
    doc.add_paragraph()
    callout(doc, "Objetivo", "Convertir la observación de competidores en decisiones de producto implementables para NutriSoft: qué problema resuelve cada patrón, cómo debería funcionar, qué datos exige y qué riesgos conviene evitar.", LIGHT, BLUE)
    doc.add_paragraph()
    add_table(doc, ["Cobertura", "Fecha de observación", "Entregable"], [["9 productos · 50+ vistas relevadas", "12 de agosto de 2026", "Referencia interna de producto"]], [2.3, 2.1, 2.35], small=False)
    doc.add_paragraph()
    para(doc, "Documento confidencial de trabajo. Las capturas corresponden a cuentas de prueba o demostración y pueden contener datos ficticios. Los precios, planes y funciones son una fotografía temporal y deben volver a verificarse antes de cualquier decisión comercial.", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    doc.add_page_break()

    doc.add_heading("Cómo leer este documento", 1)
    para(doc, "Este informe no es un catálogo de imitaciones. Cada observación se clasifica por evidencia y se transforma en una recomendación compatible con la arquitectura multi-tenant y los roles de NutriSoft.")
    add_table(doc, ["Etiqueta", "Significado", "Uso recomendado"], [
        ["Verificado en producto", "Pantalla o comportamiento accesible en una sesión activa.", "Base confiable para comparar flujos y UI."],
        ["Visible pero bloqueado", "El producto describe el módulo, pero el plan, la verificación o la falta de datos impidió recorrerlo.", "Usar como pista, no como especificación cerrada."],
        ["Declarado comercialmente", "Promesa observada en pricing, onboarding o material público.", "Validar antes de asumir profundidad funcional."],
        ["Inferencia", "Conclusión razonada a partir de varias pantallas.", "Tratar como hipótesis de producto."],
    ], [1.35, 2.55, 2.8])
    doc.add_heading("Alcance y límites", 2)
    for t in [
        "Se navegó únicamente por opciones visibles y de bajo riesgo. No se enviaron invitaciones, no se contrataron planes, no se cargaron documentos sensibles y no se confirmaron pagos.",
        "Las pantallas vacías también se auditaron: permiten evaluar onboarding, microcopy, acciones primarias, estados bloqueados y jerarquía de navegación.",
        "No se evaluaron rendimiento, seguridad técnica, exactitud clínica, calidad de modelos de IA ni experiencia móvil completa.",
        "Los datos personales que aparecen en las capturas pertenecen a la sesión de prueba del titular; si el informe se comparte externamente, conviene reemplazar las imágenes por versiones anonimizadas.",
    ]:
        bullet(doc, t)
    doc.add_heading("Índice", 2)
    add_toc(doc)

    page_break(doc)
    doc.add_heading("Resumen ejecutivo", 1)
    callout(doc, "Conclusión principal", "El mercado no converge en un único producto ganador. Se divide en cuatro promesas: operación clínica integral, acompañamiento continuo, crecimiento comercial y automatización con IA. La oportunidad de NutriSoft es unir esas promesas con una experiencia más clara, permisos sólidos y una IA auditable que nunca reemplace el criterio profesional.", GREEN, TEAL)
    doc.add_heading("Los 10 hallazgos que más importan", 2)
    for x in [
        "El dashboard más útil no sólo informa: prioriza trabajo. Nutri-Pro agrupa pacientes sin plan, con bajo cumplimiento, sin registro, borradores y planes antiguos; Vitals IA detecta riesgo de abandono.",
        "La agenda madura combina vistas día/semana/mes, filtros por profesional y sede, tipos de consulta configurables, enlace público de reservas y pagos asociados.",
        "El seguimiento entre consultas se vuelve un feed accionable. Nutrium mezcla registros de comidas, actividad física, reacciones y mensajes en una línea temporal.",
        "La biblioteca reutilizable es una ventaja defensiva. Plantillas, recetas, equivalencias, documentos, formularios y material del equipo reducen trabajo repetitivo.",
        "La captación ya forma parte del producto clínico. Nutreando convierte el perfil profesional en una landing verificable, indexable y medible, con reservas, servicios, galería y procedencia de visitas.",
        "La IA más valiosa aparece dentro de tareas concretas: crear un plan, estructurar una receta, extraer datos de una foto o documento, resumir un caso y preparar un reporte.",
        "La IA sin revisión introduce riesgo. Vitals IA muestra una cola de productos aprendidos que deben aprobarse, editarse o eliminarse; Harbiz contempla contenido de equipo pendiente de validación.",
        "Los reportes configurables pueden convertirse en una pieza central de percepción de calidad. Vitals IA permite ordenar, activar y editar secciones antes de descargar o enviar.",
        "Los paywalls y bloqueos funcionan mejor cuando explican condición, beneficio y próxima acción. Nutri-Pro comunica con precisión qué depende de verificación profesional y qué depende del plan.",
        "Los productos más claros separan clínica, comunicación, inteligencia y cuenta; los más densos exponen demasiados módulos al mismo nivel y elevan la curva de aprendizaje.",
    ]:
        bullet(doc, x)

    doc.add_heading("Mapa rápido de posicionamiento", 2)
    add_table(doc, ["Plataforma", "Fortaleza dominante", "Patrón distintivo", "Riesgo principal"], [
        ["Nutrium", "Operación clínica madura", "Feed de acompañamiento + plantillas", "Alta densidad y navegación icónica"],
        ["Nutreando", "Consultorio + captación", "Perfil público verificable y medible", "Amplitud difícil de validar sin plan"],
        ["Nutri-Pro", "Gobernanza y priorización", "Cola de atención + bloqueos explicados", "Producto temprano y varios módulos restringidos"],
        ["Vitals IA", "Seguimiento automatizado", "Fotos/Telegram + reportes configurables", "IA y base global requieren control fuerte"],
        ["cheNutri", "Contenido nutricional directo", "Recetario + equivalencias + PDF", "Inconsistencia visual y módulos en desarrollo"],
        ["MuraTrack", "Simplicidad de práctica", "Onboarding de 3 pasos + bioimpedancia", "Cobertura funcional limitada"],
        ["Trofenia", "Operación de equipos", "Agenda, pagos fallidos y catering", "Menú muy extenso"],
        ["Harbiz público", "Packaging comercial", "Planes + add-ons + pagos automáticos", "Moneda presentada de forma ambigua"],
        ["Harbiz app", "Productividad y escala", "Accesos rápidos e IA contextual", "Sobrecarga por amplitud wellness"],
    ], [1.05, 1.7, 2.25, 1.75])

    profile(doc, "1. Nutrium", "Producto clínico consolidado, centrado en consulta, planificación y acompañamiento.",
        "Verificado en producto: inicio, agenda, pacientes, acompañamiento, recetas, equivalencias y modelos de planes.",
        "Nutrium transmite madurez y profundidad. Su propuesta no depende de una pantalla espectacular, sino de una red coherente de módulos clínicos. La principal tensión es la densidad: usa una barra lateral casi exclusivamente icónica y tipografía pequeña, eficiente para usuarios expertos pero menos amigable para una primera experiencia.",
        [
            ("Inicio", "Combina consulta en curso, próximas consultas, indicadores de los últimos 30 días y actividad. La pantalla funciona como centro operativo, no sólo como reporte."),
            ("Agenda", "Vistas diaria, semanal y mensual; navegación anterior/hoy/siguiente; grilla horaria; tarjeta de consulta en curso; configuración progresiva de horario laboral, sedes y servicios."),
            ("Pacientes", "Alta de cliente, búsqueda, filtros, exportación y tabla con ubicación, contacto, última y próxima consulta, estado mensual y acción rápida de mensaje."),
            ("Acompañamiento", "Feed unificado de actividad. Un mismo patrón representa cumplimiento de comidas, ejercicio, mensajes y reacciones; la actividad física incluye duración, calorías y distancia."),
            ("Recetas", "Búsqueda, orden nutricional, categorías y separación entre recetas propias, de comunidad y del sistema. En la sesión observada parte de la biblioteca estaba deshabilitada."),
            ("Equivalencias", "Distingue listas de equivalentes y grupos de alimentos; permite crear, filtrar, buscar y elegir base de datos."),
            ("Modelos", "Plantillas del sistema por objetivo calórico, con energía total y porcentajes de grasa, carbohidratos y proteína visibles antes de abrir."),
        ],
        ["Profundidad clínica y continuidad entre consulta, plan y seguimiento.", "Plantillas con metadatos suficientes para comparar antes de reutilizar.", "El feed reduce la fragmentación entre chat, adherencia y ejercicio."],
        ["La navegación basada en íconos exige aprendizaje y tooltips impecables.", "La densidad y el tamaño tipográfico pueden afectar accesibilidad.", "Una actividad larga necesita filtros, agrupación y resúmenes para evitar ruido."],
        "Adoptar el concepto de feed clínico, pero con filtros claros, prioridades y resúmenes diarios. Para plantillas, mostrar objetivo, calorías, macros, autor, última actualización y número de usos. Conservar etiquetas textuales en la navegación principal de NutriSoft.",
        ("nutrium-follow-up.png", "Nutrium — acompañamiento: línea temporal de registros, actividad física, reacciones y mensajes."))

    image(doc, "nutrium-agenda.png", "Nutrium — agenda semanal con preparación progresiva de horarios, sedes y servicios.")

    profile(doc, "2. Nutreando", "Suite para consultorios con una capa especialmente fuerte de presencia pública y adquisición.",
        "Verificado: página pública, configuración, academia y precios. Visible pero bloqueado: historia clínica/pacientes y varios módulos operativos por falta de plan.",
        "Nutreando tiene la mejor traducción de la identidad profesional a producto. La página pública no es un formulario aislado: vincula verificación, posicionamiento, reservas, medición de tráfico, WhatsApp, servicios, galería, redes y control de qué secciones publicar. Su interfaz moderna usa tarjetas redondeadas, microcopy abundante y estados explícitos.",
        [
            ("Navegación", "Sidebar textual, búsqueda global con atajo ⌘K, notificaciones, perfil y módulos bloqueados identificados. Separa inicio, pacientes, chats, agenda, planes, alimentos, recursos, formularios, pagos, catálogo y página pública."),
            ("Perfil público", "Progreso 1/7, checklist accionable, enlace compartible, directorio, habilitación para buscadores y analítica de origen de visitas."),
            ("Verificación", "Matrícula nacional/provincial, jurisdicción, vencimiento y comprobante; revisión anunciada dentro de 24 horas hábiles; evidencia privada."),
            ("Contenido profesional", "Título, tratamiento, biografía y enfoque con editor enriquecido, años de experiencia calculados, poblaciones atendidas, idiomas, formación, certificaciones, obras sociales y práctica particular."),
            ("Conversión", "WhatsApp, video, redes, sitio, servicios con precios, reservas online, reseñas, ubicación y galería del consultorio; cada bloque puede ocultarse."),
            ("Configuración", "Identidad, teléfono, rol/especialidad, nombre con que el portal se dirige al paciente, recuperación segura y firma digital para certificados."),
            ("Academia", "Colecciones de lecciones con progreso; convierte soporte en onboarding autoservicio."),
            ("Planes", "Perfil profesional gratuito; Inicial ARS 40.000/mes con todas las funciones, IA y hasta 10 pacientes; Pro ARS 70.000/mes con pacientes ilimitados y equipo. Anual anunciado con 20% de descuento."),
        ],
        ["Excelente conexión entre completar el perfil y obtener un beneficio visible.", "Microcopy específica: explica privacidad, indexación, métricas y próximos pasos.", "La configuración respeta identidad profesional y seguridad."],
        ["El formulario público es muy largo; requiere navegación por secciones y guardado confiable.", "Parte de la propuesta clínica sólo pudo verificarse mediante superficies bloqueadas o testimonios.", "La cantidad de opciones puede retrasar el momento de valor si no hay onboarding adaptativo."],
        "Crear en NutriSoft una capa de presencia pública por profesional y por consultorio, con checklist, preview, verificación documental, reserva y analítica. La publicación debe ser gradual: identidad mínima primero; servicios, contenido, reseñas y SEO después.",
        ("nutreando-presencia.png", "Nutreando — página pública: progreso, verificación, visibilidad y edición modular del perfil."))

    image(doc, "nutreando-subscribe.png", "Nutreando — packaging de planes en moneda local, con límites expresados en pacientes y equipo.")

    profile(doc, "3. Nutri-Pro", "Producto emergente con foco en gobernanza, planes alimenticios e IA contextual.",
        "Verificado: planes alimenticios, datos profesionales, configuración y facturación. Varios módulos operativos quedaron bloqueados por verificación pendiente.",
        "Nutri-Pro destaca menos por amplitud que por claridad de estados. Explica qué habilita la verificación profesional, qué depende del plan y qué está próximo. Su módulo de planes prioriza pacientes que necesitan acción y convierte métricas en una cola operativa.",
        [
            ("Arquitectura", "Agrupa Operar, Comunicar, Inteligencia y Cuenta. Incluye búsqueda global, asistente Pasita y menú colapsable."),
            ("Planes", "Pestañas de inicio, diseño, platillos, guardados y asignación. Indicadores: sin plan, bajo cumplimiento, sin registro, borradores y sin revisar. Cola de atención y distribución de cumplimiento."),
            ("Verificación", "Cédula, identificación oficial, rostro y revisión manual. Los archivos tienen enlace temporal; los módulos restringidos enlazan al estado de verificación."),
            ("Alertas", "Mensajes, recordatorios de citas, citas vencidas y temporizadores globales para comidas no registradas y tolerancia de confirmación."),
            ("IA", "Pasita puede trabajar en modo independiente y mostrarse en panel acoplado o superpuesto. El modo independiente promete ejecutar acciones sin confirmación, una decisión potente pero riesgosa."),
            ("Preferencias", "Tema claro/oscuro/sistema y densidad del panel por dispositivo."),
            ("Planes comerciales", "Freemium: dos altas de pacientes de por vida. Plus: MXN 179/mes, hasta 30 activos, citas, chat y MFA. Ultra + IA: MXN 479/mes, hasta 50 activos y 1,5 M tokens/mes, marcado como próximo."),
        ],
        ["Bloqueos explicados con causa y acción siguiente.", "Dashboard orientado a excepciones clínicas.", "Preferencias de densidad y notificaciones útiles para profesionales con distinta carga."],
        ["El límite de dos altas vitalicias puede generar frustración aunque el paciente se archive.", "La IA autónoma necesita confirmaciones por nivel de riesgo y registro de auditoría.", "La verificación bloquea gran parte del recorrido y puede aumentar abandono si el SLA no es claro."],
        "Incorporar una bandeja de trabajo basada en excepciones. Para IA, reemplazar el concepto binario de autonomía por niveles: sugerir, preparar borrador, ejecutar con confirmación y automatizar sólo acciones reversibles. Toda acción debe mostrar autor, fuente y posibilidad de deshacer.",
        ("nutri-pro-plans.png", "Nutri-Pro — inicio de planes alimenticios con indicadores de atención y acciones rápidas."))

    profile(doc, "4. Vitals IA", "Seguimiento automatizado con IA, bot de mensajería y reportes clínicos componibles.",
        "Verificado: inicio, pacientes, templates, recetas, productos, analytics, reportes y antropometría. Los planes pagos se observaron en la pantalla de suscripción.",
        "Vitals IA es el competidor que más explícitamente convierte IA en operación cotidiana. Propone conectar pacientes a Telegram, analizar fotos, aprender alimentos y generar planes. Su mejor pieza no es sólo la automatización: es el constructor de reportes, porque combina datos clínicos, orden editable y salida profesional.",
        [
            ("Onboarding", "Cuatro primeros pasos con tiempo estimado: conectar bot, crear plan con IA, compartir agenda y completar perfil; además muestra cuenta regresiva de prueba."),
            ("Recetas", "Búsqueda, categorías y tarjetas con porciones, calorías y gramos de proteína, carbohidratos y grasas; edición y borrado directos."),
            ("Productos", "Prioriza productos propios con macros de rótulo. Los alimentos detectados por IA entran en una cola de revisión con aprobar, editar como copia personal o eliminar globalmente."),
            ("Analytics", "Vista general y por paciente; vinculados, actividad semanal/mensual, adherencia, fotos, check-ins, objetivos, bienestar, tendencia de registros y riesgo de abandono."),
            ("Reportes", "Paciente, período, plantilla y secciones reordenables. Incluye identidad, datos clínicos, resumen, peso, medidas, ISAK, macros, adherencia, comidas, bienestar, plan, fotos, consultas, notas, recomendaciones y firma."),
            ("Antropometría", "Listado por paciente con última evaluación y soporte explícito de ISAK."),
            ("Comercial", "Basic ARS 29.000/mes hasta 10 pacientes; Pro ARS 45.000 hasta 30; Unlimited ARS 65.000 y multiusuario. Todos anuncian bot, fotos con IA, analytics, plan IA, Google Calendar, reportes, recetas, directorio y autoagendado."),
        ],
        ["Onboarding vinculado a resultados concretos y tiempos estimados.", "Constructor de reportes excepcionalmente claro y modular.", "La cola de revisión hace visible la incertidumbre de la IA."],
        ["Eliminar un alimento globalmente es una acción de alto impacto y debería requerir permisos reforzados.", "Un bot externo suma dependencia, consentimiento y riesgo de datos de salud.", "Las métricas grupales deben evitar comparaciones clínicas simplistas."],
        "Prioridad alta: constructor de reportes NutriSoft con plantillas por consultorio, orden de secciones, preview y firma. La IA puede redactar un borrador de resumen y recomendaciones, pero debe citar datos usados y requerir aprobación profesional.",
        ("vitals-ia-reportes.png", "Vitals IA — constructor de reportes con secciones activables, reordenables y editables."))

    image(doc, "vitals-ia-analytics.png", "Vitals IA — analytics general, wellness, actividad y detección de riesgo de abandono.")

    profile(doc, "5. cheNutri", "Herramienta argentina centrada en recetario, planes, equivalencias y registro diario.",
        "Verificado: dashboard, pacientes, registros, recetas, equivalencias, planes, recursos, turnos, cobros y configuración. Algunas funciones estaban vacías o en desarrollo.",
        "cheNutri privilegia conceptos que el profesional reconoce de inmediato. El menú es extenso pero explícito, y la biblioteca de recetas ofrece valor desde el primer día. Su experiencia es menos refinada visualmente que Nutreando o Harbiz, aunque la orientación nutricional es directa.",
        [
            ("Dashboard", "Cumplimiento de pacientes en siete días, accesos rápidos y resumen diario por desayuno, almuerzo, merienda y cena."),
            ("Pacientes", "Contador de activos, límite del plan y estado vacío con acción primaria para cargar el primero."),
            ("Registros", "Navegación por día, selector de fecha, filtro y conteo; estado vacío específico cuando nadie registró comidas."),
            ("Recetas", "Más de 60 recetas declaradas, filtradas por principales, acompañamientos, colaciones y postres. Cada tarjeta muestra autor, categoría, ingredientes y porciones; se anuncian macros y copia editable a biblioteca propia."),
            ("Equivalencias", "Grupos de alimentos o comidas intercambiables sin romper el plan; creación desde estado vacío."),
            ("Planes", "Plantillas reutilizables creadas sobre la base de alimentos y salida PDF con color/logo."),
            ("Recursos", "Artículos y enlaces educativos compartibles con pacientes."),
            ("Turnos y cobros", "Turnos dependen de Google Calendar; cobros estaba marcado en desarrollo. Chat aparece restringido a Pro/Max/Organizaciones."),
        ],
        ["Biblioteca inicial que evita empezar desde cero.", "Lenguaje directo y localizado para profesionales argentinos.", "Estados vacíos simples con una acción obvia."],
        ["Anuncios persistentes y navegación larga compiten con el contenido.", "Algunos módulos son promesas o dependen de integraciones externas.", "La calidad visual y la consistencia de componentes son desiguales."],
        "Construir Recetario NutriSoft con dos capas: biblioteca curada del sistema y biblioteca privada del profesional. Copiar nunca debe modificar el original; guardar procedencia y versión. Las equivalencias deben mantener reglas nutricionales y advertir diferencias relevantes.",
        ("chenutri-recipes.png", "cheNutri — recetario prepoblado con categorías y tarjetas reutilizables."))

    profile(doc, "6. MuraTrack", "Producto liviano para práctica nutricional, con énfasis en mediciones y puesta en marcha.",
        "Verificado: dashboard, pacientes, perfil y suscripción. Agenda y templates mostraron contenido mínimo en la sesión.",
        "MuraTrack ofrece la experiencia más acotada del grupo. Su fortaleza es el onboarding: tres pasos, cada uno con tiempo estimado, y un dashboard que explica el significado de cada métrica. Presenta bioimpedancia como parte central del valor.",
        [
            ("Onboarding", "Completar matrícula/especialidad, cargar primer paciente y explorar su ficha; 0/3 visible y opción de omitir."),
            ("Dashboard", "Total de pacientes, mediciones recientes, análisis de bioimpedancia de 30 días, pacientes nuevos, tasa de seguimiento, crecimiento y actividad."),
            ("Actividad", "Últimas actualizaciones con explicación del estado vacío."),
            ("Uso del plan", "Pacientes, análisis, planes y templates; el plan observado era Pro con límites ilimitados."),
            ("Pacientes", "Búsqueda por nombre, email o teléfono; alta deshabilitada en la sesión, probablemente por estado de onboarding o carga."),
            ("Privacidad", "Banner de cookies con aceptar/rechazar, persistente durante la auditoría."),
        ],
        ["Onboarding breve y medible.", "Métricas explicadas con texto, no sólo números.", "Alcance reducido que disminuye curva inicial."],
        ["Varias vistas mostraron poco contenido o acciones deshabilitadas.", "La dependencia de bioimpedancia debe contemplar equipos y formatos distintos.", "El email del usuario queda muy visible en navegación, innecesario para el trabajo diario."],
        "Usar un onboarding de NutriSoft por rol: tres acciones para Nutricionista y otras tres para Responsable. Mostrar tiempo estimado, beneficio y opción de posponer. Evitar listas de configuración largas antes del primer valor.",
        ("muratrack-initial.png", "MuraTrack — onboarding de tres pasos y dashboard de práctica nutricional."))

    profile(doc, "7. Trofenia", "Suite argentina orientada a equipos, agenda, pagos y operaciones especializadas.",
        "Verificado: dashboard, pacientes, agenda, antropometría, consultas, templates, catering, reportes, pagos fallidos y configuración básica.",
        "Trofenia tiene la arquitectura más administrativa. Incluye consultorios, profesionales, tipos de consulta, integración de pagos, equipo y reportes. Su módulo de catering abre un segmento B2B poco cubierto por otros competidores.",
        [
            ("Agenda", "Enlace público de reservas, filtros por profesional y consultorio, navegación semanal, vistas mes/semana/día/agenda y alta de turno."),
            ("Tipos de consulta", "Nombre, duración y color como prerrequisitos para agendar; buen ejemplo de configuración reusable."),
            ("Antropometría", "Total de mediciones, pacientes únicos, actividad del mes y filtros por paciente, profesional y fechas."),
            ("Consultas", "Registro independiente de turnos, con profesional y período; habilita historia de atenciones realizadas."),
            ("Templates del equipo", "Cualquier miembro puede marcar un plan como plantilla y compartirlo automáticamente con el equipo."),
            ("Estadísticas", "Turnos, ingresos, ingresos perdidos, finalización, cancelaciones, inasistencias, pagos, reembolsos, conversión y desempeño por tipo."),
            ("Pagos fallidos", "Monto potencial perdido, rechazados por Mercado Pago, pendientes de más de 24 horas, búsqueda y exportación CSV."),
            ("Catering", "Instituciones, comensales y menús activos para comedores empresariales o instituciones."),
        ],
        ["Buen modelo multi-profesional y multi-sede.", "Relaciona agenda, pagos y reportes comerciales.", "Explora una vertical B2B distinta mediante catering."],
        ["Menú lateral muy extenso y sin progresión por rol.", "Muchas pantallas separadas pueden fragmentar el contexto del paciente.", "Compartir templates automáticamente requiere propiedad, revisión y versionado."],
        "Adoptar tipos de consulta configurables y filtros por sede/profesional. Crear una biblioteca del consultorio con estados privado, compartido y publicado; el responsable puede aprobar contenido común. Dejar catering fuera del core inicial salvo validación comercial explícita.",
        ("trofenia-agenda.png", "Trofenia — agenda de equipo con filtros, vistas y enlace público de reservas."))

    image(doc, "trofenia-appointment-report.png", "Trofenia — reporte operativo de turnos, ingresos, cancelaciones y conversión.")

    profile(doc, "8. Harbiz — propuesta comercial", "Packaging de una plataforma wellness todo-en-uno con add-ons y automatización de pagos.",
        "Declarado comercialmente en la página pública de tarifas; no se iniciaron compras ni pruebas nuevas.",
        "La página de Harbiz organiza la venta alrededor del número de clientes y del nivel de soporte, no alrededor de módulos recortados. Después monetiza necesidades avanzadas mediante add-ons: marca propia, Nutri AI y biblioteca de videos.",
        [
            ("Planes mensuales", "Basic muestra 5 clientes y 19; Pro 50 clientes y 129; App 50 clientes y 219. La página usa símbolo $ mientras la FAQ dice que el precio se muestra en €/mes: inconsistencia que debe verificarse."),
            ("Anual", "Toggle con 25% de ahorro y precios mensualizados."),
            ("Prueba", "14 días, sin tarjeta, permanencia ni límites durante la prueba."),
            ("Add-ons", "App personalizada 24,99/mes; Nutri AI 14,99/mes con 900+ recetas; biblioteca de videos 19,99/mes. Muestra también equivalentes con ahorro anual."),
            ("Pagos", "Suscripciones, recuperación de cobros fallidos y facturación automática como bloque comercial propio."),
            ("Prueba social", "Más de 10.000 profesionales y soporte diferencial por plan."),
        ],
        ["Packaging comprensible por escala de negocio.", "Add-ons conectados a resultados concretos.", "Responde objeciones con FAQ y prueba sin tarjeta."],
        ["La inconsistencia monetaria reduce confianza.", "El plan App mantiene el mismo límite de clientes que Pro y exige explicar mejor el diferencial.", "Los add-ons pueden fragmentar la experiencia si aparecen como venta constante dentro del producto."],
        "Para NutriSoft, mantener un core clínico completo y cobrar por escala, colaboración y automatización avanzada. Mostrar precio final en ARS, fecha de actualización, impuestos y límite exacto. Los add-ons sólo deben existir si añaden costos operativos reales o un segmento claro.",
        ("harbiz-precios-anual.png", "Harbiz — estructura de planes, ahorro anual y venta por escala."))

    profile(doc, "9. Harbiz — aplicación profesional", "Centro de productividad para nutrición, entrenamiento y wellness.",
        "Verificado: home, menú de biblioteca, nutrición, documentos, formularios y plantillas. Algunas rutas directas quedaron en blanco y se reabrieron mediante navegación visible.",
        "Harbiz sobresale en accesos rápidos configurables y amplitud de contenidos. La pantalla de inicio convierte acciones frecuentes en tarjetas: crear plan o receta con IA, agregar cliente, compartir archivos, preparar formularios o agendar sesiones. También muestra actividad, tareas, eventos, cumplimiento y suscripciones.",
        [
            ("Inicio", "Accesos rápidos configurables, bloques de ahorro/crecimiento, actividad reciente, tareas, próximos eventos, cumplimiento y venta de pagos."),
            ("IA contextual", "Acciones específicas para plan nutricional, receta, workout y programa. La IA aparece como atajo de creación, no como chat genérico aislado."),
            ("Biblioteca", "Actividad física, videos, nutrición, programas, documentos, formularios, plantillas, logros y contenido del equipo por validar."),
            ("Nutrición", "Planes y recetas en una sección propia dentro de la biblioteca; la navegación conserva breadcrumbs y subcategorías."),
            ("Plantillas", "73 recursos visibles en la sesión, organizados en packs y niveles; enfatiza empezar sin crear desde cero."),
            ("Agenda", "El inicio ya presenta eventos por semana y más adelante, tipo, cupos, fecha y horario; el acceso dedicado no se pudo capturar de forma estable."),
            ("Cumplimiento", "Lista breve de clientes con porcentajes semanales para revisar."),
        ],
        ["Acciones rápidas alineadas a intención del usuario.", "Biblioteca transversal y reutilizable.", "IA embebida en el punto donde comienza una tarea."],
        ["La amplitud wellness introduce conceptos ajenos a una plataforma puramente nutricional.", "El home mezcla operación, marketing y venta interna.", "Las rutas SPA mostraron cargas en blanco al navegar por URL directa; la navegación visible fue más estable."],
        "Crear un launcher de acciones rápidas personalizable en NutriSoft: nuevo paciente, nueva consulta, plan, receta, recurso, turno y reporte. Mantener IA como variante de cada acción ('crear con asistencia'), con borrador revisable y sin ocultar el flujo manual.",
        ("harbiz-app-initial.png", "Harbiz — home profesional con accesos rápidos, IA contextual, eventos y cumplimiento."))

    image(doc, "harbiz-nutrition-live2.png", "Harbiz — biblioteca de nutrición accesible desde una arquitectura general de contenidos.")

    page_break(doc)
    doc.add_heading("Patrones transversales por función", 1)
    doc.add_heading("Navegación e información", 2)
    add_table(doc, ["Patrón", "Dónde aparece", "Decisión para NutriSoft"], [
        ["Sidebar textual por dominios", "Nutreando, Nutri-Pro, cheNutri, Trofenia", "Mantener texto + icono; agrupar Operación, Contenido, Seguimiento y Gestión."],
        ["Navegación icónica compacta", "Nutrium", "Reservar para modo colapsado; nunca como única señal inicial."],
        ["Megamenú superior", "Harbiz", "Útil sólo si NutriSoft amplía mucho sus dominios; hoy agregaría complejidad."],
        ["Búsqueda global", "Nutreando, Nutri-Pro", "Prioridad media-alta: pacientes, acciones, recetas, planes y ajustes."],
        ["Accesos rápidos configurables", "Harbiz", "Prioridad alta para reducir pasos en tareas frecuentes."],
    ], [1.55, 1.9, 3.0])
    doc.add_heading("Estados, onboarding y confianza", 2)
    for x in [
        "Mostrar progreso únicamente cuando cada paso desbloquea valor real. Buenos ejemplos: Nutreando 1/7, MuraTrack 0/3 y Vitals IA con tiempo estimado.",
        "Diferenciar 'próximamente', 'requiere plan', 'requiere verificación', 'sin datos' y 'sin permiso'. Cada estado necesita explicación y acción siguiente.",
        "La verificación profesional debe separar datos públicos de evidencia privada, incluir estado, SLA, motivo de rechazo y reenvío.",
        "No bloquear toda la plataforma mientras se verifica. Permitir explorar demos, crear borradores y configurar contenido sin publicarlo ni asignarlo.",
    ]:
        bullet(doc, x)
    doc.add_heading("Seguimiento y analítica", 2)
    add_table(doc, ["Nivel", "Pregunta que responde", "Ejemplos"], [
        ["Paciente", "¿Qué cambió y qué requiere intervención?", "Adherencia, peso, bienestar, comidas, mensajes, última actividad."],
        ["Cartera profesional", "¿A quién debo atender primero?", "Sin plan, bajo cumplimiento, sin registro, abandono, planes antiguos."],
        ["Consultorio", "¿Cómo funciona la operación?", "Turnos, finalización, cancelaciones, ingresos, profesionales y sedes."],
        ["Plataforma", "¿Qué ocurre comercialmente?", "Consultorios activos, pacientes, cobros, vencimientos y uso de módulos."],
    ], [1.2, 2.45, 2.8])
    callout(doc, "Regla de diseño", "Cada métrica debe tener definición, período, población incluida, estado sin datos y una acción posible. Si una cifra no cambia ninguna decisión, no merece protagonismo.", AMBER, DARK)

    page_break(doc)
    doc.add_heading("Consultor de ideas: especificaciones listas para producto", 1)
    para(doc, "Las siguientes fichas convierten los patrones observados en funciones posibles para NutriSoft. No son compromisos de alcance: sirven para discutir, priorizar y pasar a diseño técnico.")

    blueprint(doc, 1, "Bandeja inteligente del nutricionista",
        "Reducir el tiempo para detectar qué paciente necesita atención y evitar que el dashboard sea sólo decorativo.",
        "Nutri-Pro (cola por excepciones), Vitals IA (riesgo de abandono), Nutrium (feed de actividad) y Harbiz (cumplimiento).",
        ["Abrir Inicio y ver grupos priorizados: urgentes, requieren revisión, próximos y al día.", "Cada tarjeta explica por qué apareció, desde cuándo y cuál es la acción sugerida.", "Filtrar por consultorio, profesional, período y tipo de alerta.", "Marcar resuelta, posponer o convertir en tarea; conservar historial."],
        "patient_id, professional_id, tenant_id, alert_type, evidence, severity, detected_at, due_at, status, resolution.",
        "El nutricionista ve sólo pacientes asignados; responsable ve alertas administrativas del consultorio, no notas clínicas salvo permiso explícito; admin de plataforma sólo métricas agregadas.",
        "Sin pacientes, datos incompletos, alerta duplicada, paciente reasignado, datos atrasados, alerta resuelta por otra acción.",
        "MVP con reglas determinísticas; fase 2 con ranking personalizable; fase 3 con explicación asistida por IA.",
        "Toda alerta identifica evidencia y acción; resolverla actualiza el conteo sin recarga; nunca se mezclan tenants; las reglas pueden desactivarse por consultorio.",
        "La IA resume contexto y sugiere prioridad, pero no diagnostica ni cambia tratamiento. Debe mostrar los datos utilizados.")

    blueprint(doc, 2, "Feed clínico de seguimiento",
        "Unificar registros de comidas, actividad, bienestar, mensajes, check-ins, documentos y cambios de plan en una cronología legible.",
        "Nutrium aporta el patrón de feed; cheNutri, Vitals IA y Harbiz aportan tipos de evento.",
        ["Entrar a un paciente y ver cronología con resumen de hoy/semana.", "Filtrar por alimento, actividad, bienestar, comunicación, medición o sistema.", "Reaccionar, comentar, crear nota clínica o iniciar conversación desde el evento.", "Agrupar eventos repetitivos y expandir bajo demanda."],
        "event_id, patient_id, actor, type, payload versionado, source, occurred_at, visibility, related_entity.",
        "Notas clínicas privadas; comentarios compartibles diferenciados; eventos del sistema inmutables; adjuntos con URL temporal.",
        "Eventos fuera de orden, zona horaria, borrado del contenido origen, carga masiva, registros duplicados y paciente sin actividad.",
        "MVP con cinco tipos de evento; fase 2 con agrupación y acciones; fase 3 con resumen semanal.",
        "El feed ordena por hora real, permite filtrar, respeta visibilidad y conserva referencia al origen. Un resumen nunca oculta eventos críticos.",
        "Resumen narrativo con enlaces a los eventos fuente y etiqueta explícita de contenido generado.")

    blueprint(doc, 3, "Constructor profesional de reportes",
        "Elevar la percepción de calidad y ahorrar trabajo al convertir datos dispersos en un informe controlable.",
        "Vitals IA es la referencia principal; Nutreando aporta firma, ISAK y personalización; cheNutri aporta PDF con marca.",
        ["Elegir paciente, período y plantilla.", "Activar, desactivar, editar y reordenar secciones.", "Previsualizar cambios en tiempo real.", "Guardar borrador, descargar PDF o compartir por canal autorizado.", "Registrar versión, autor y fecha de entrega."],
        "report, report_template, report_section, snapshot_data, generated_file, delivery_log, professional_signature.",
        "Sólo profesionales con acceso clínico generan; responsable puede administrar branding sin leer contenido; enlaces compartidos expiran.",
        "Período sin datos, valores fuera de rango, firma ausente, paciente menor, regeneración luego de cambios, error de PDF.",
        "MVP con cinco secciones y PDF; fase 2 plantillas por consultorio; fase 3 redacción asistida y comparación longitudinal.",
        "El PDF coincide con preview, conserva datos congelados, muestra período/unidades/fuente y genera auditoría de entrega.",
        "Redactar borrador de resumen y recomendaciones sólo con hechos presentes; cada afirmación debe enlazar a su métrica o nota fuente.")

    blueprint(doc, 4, "Recetario curado, privado y compartido",
        "Dar valor inmediato sin quitar autoría ni control al profesional.",
        "cheNutri (biblioteca inicial y copia), Vitals IA (macros visibles), Nutrium (propias/comunidad/sistema) y Harbiz (biblioteca).",
        ["Explorar grilla con foto, categoría, dieta, tiempo, porciones, kcal y macros.", "Copiar una receta del sistema a la biblioteca propia.", "Editar la copia, mantener procedencia y publicar a pacientes asignados.", "Filtrar por comida, dieta, alérgenos, calorías y autor."],
        "recipe, recipe_version, ingredient, portion, nutrition_facts, tags, allergens, ownership, visibility, source_recipe_id.",
        "Sistema edita biblioteca curada; profesional edita sus copias; consultorio comparte sólo contenido aprobado; paciente sólo lectura.",
        "Ingrediente eliminado, macros incompletos, duplicados, cambio de porciones, alérgenos, receta retirada y foto sin licencia.",
        "MVP con 20 recetas propias de NutriSoft y creación manual; fase 2 biblioteca compartida; fase 3 formateo asistido.",
        "Copiar nunca modifica original; recalcular porciones es consistente; filtros combinan correctamente; alérgenos quedan visibles.",
        "Transformar un borrador libre en campos estructurados y proponer etiquetas; nunca inventar cantidades ni datos nutricionales sin marcar incertidumbre.")

    blueprint(doc, 5, "Equivalencias con reglas nutricionales",
        "Ofrecer flexibilidad al paciente sin convertir una sustitución en una decisión clínica opaca.",
        "Nutrium y cheNutri presentan listas/grupos de equivalentes; ambos los integran a planificación.",
        ["Crear grupo con objetivo y unidad base.", "Agregar opciones y definir porción equivalente.", "Mostrar diferencias relevantes y advertencias.", "Asignar grupo a una comida o plan; paciente elige entre opciones habilitadas."],
        "exchange_group, exchange_item, base_quantity, nutrient_tolerance, allergens, plan_assignment.",
        "Sólo profesional crea y asigna; responsable no altera equivalencias clínicas; paciente registra elección sin editar reglas.",
        "Opciones no equivalentes, porciones cero, alimentos alérgenos, unidad incompatible, grupo vacío, cambio tras asignación.",
        "MVP manual; fase 2 comparación automática; fase 3 sugerencias asistidas con aprobación.",
        "Toda opción muestra porción; las diferencias fuera de tolerancia requieren confirmación; cambios versionan planes ya publicados.")

    blueprint(doc, 6, "Agenda multi-profesional y reservas públicas",
        "Centralizar disponibilidad, reducir coordinación manual y conectar turno con servicio, sede y pago.",
        "Nutrium (vistas y configuración), Trofenia (equipo/sede/enlace), Nutreando y Vitals IA (autogestión), cheNutri (Google Calendar).",
        ["Configurar sedes, horarios, bloqueos y tipos de consulta con duración/color/precio.", "Publicar enlace por profesional o consultorio.", "Paciente elige servicio, modalidad, profesional y horario.", "Crear reserva pendiente/confirmada según regla de pago.", "Enviar recordatorios y permitir reprogramación dentro de política."],
        "availability_rule, location, service_type, appointment, attendee, booking_source, payment_requirement, reminder.",
        "Profesional administra su agenda; responsable configura reglas globales; paciente ve sólo disponibilidad; integración externa con OAuth y mínimo alcance.",
        "Doble reserva, zona horaria, feriados, duración variable, pagos pendientes, cancelación tardía, sincronización conflictiva.",
        "MVP agenda interna; fase 2 link público; fase 3 Google Calendar y señas.",
        "Nunca se ofrecen solapamientos; el cupo se bloquea transaccionalmente; cada cambio notifica y audita; la agenda funciona aunque falle la integración externa.")

    blueprint(doc, 7, "Perfil público y directorio verificable",
        "Convertir la identidad profesional en captación y confianza, sin mezclar evidencia privada con datos públicos.",
        "Nutreando es la referencia central; Vitals IA y Nutri-Pro aportan directorio/verificación.",
        ["Completar identidad mínima y previsualizar perfil.", "Enviar matrícula y evidencia privada a revisión.", "Activar secciones públicas: bio, enfoque, servicios, sedes, redes, galería y reservas.", "Publicar URL estable, medir visitas, contactos y reservas por origen."],
        "public_profile, verification_case, credential, service, location, media, visibility_settings, attribution_event.",
        "Moderador separado del admin comercial; documentos privados cifrados y con acceso temporal; consentimiento para publicación.",
        "Matrícula vencida, profesión sin organismo verificable, rechazo, duplicidad, baja del profesional, URL anterior y reseñas abusivas.",
        "MVP perfil + reserva; fase 2 verificación; fase 3 directorio y SEO.",
        "Preview coincide con público; cada campo tiene control de visibilidad; documentos nunca aparecen en HTML público; métricas excluyen visitas propias.")

    blueprint(doc, 8, "Biblioteca de recursos multi-tenant",
        "Permitir que el nutricionista comparta PDFs, enlaces y videos con sus pacientes sin filtrar contenido entre profesionales o consultorios.",
        "Harbiz (documentos/formularios/plantillas), cheNutri (recursos), Nutreando (recursos) y Trofenia (templates del equipo).",
        ["Subir archivo o enlace con título, descripción, tags y miniatura.", "Elegir visibilidad: privado, pacientes propios, consultorio o pacientes seleccionados.", "Publicar y notificar; registrar visualización/descarga.", "Versionar, retirar o reemplazar manteniendo historial."],
        "resource, resource_version, asset, owner, tenant_id, visibility_scope, assignment, access_event.",
        "Política deny-by-default; URLs firmadas; análisis antivirus; límites de tamaño/tipo; separación estricta por tenant y professional_id.",
        "Archivo infectado, enlace roto, profesional desvinculado, paciente reasignado, recurso retirado, cuota excedida.",
        "MVP PDF/enlace y pacientes propios; fase 2 video y consultorio; fase 3 analítica y sugerencias.",
        "Un paciente jamás accede a recursos fuera de su asignación; retirar invalida enlaces; cada acceso queda auditable.")

    blueprint(doc, 9, "Centro de productos aprendidos por IA",
        "Aprovechar detecciones repetidas sin contaminar silenciosamente la base nutricional.",
        "Vitals IA muestra productos propios y aprendidos por IA con cola de revisión.",
        ["IA detecta producto nuevo y crea candidato con fuente y confianza.", "Profesional revisa imagen/rótulo, corrige y aprueba como privado.", "Un curador de plataforma puede promoverlo a catálogo global mediante flujo separado.", "Las recetas/planes priorizan productos propios y aprobados."],
        "product_candidate, evidence_asset, extraction_fields, confidence, reviewer, product_version, catalog_scope.",
        "Profesional nunca elimina globalmente; promoción global requiere rol curador y doble validación; conservar licencia/procedencia.",
        "Rótulo ilegible, porción ambigua, país diferente, producto reformulado, duplicado, imagen con datos personales.",
        "MVP catálogo privado; fase 2 extracción OCR; fase 3 curación global.",
        "Nada entra al catálogo global sin revisión; los cambios no alteran retroactivamente reportes; cada campo conserva evidencia y confianza.",
        "Extraer datos y detectar inconsistencias. No inferir macros faltantes como si fueran valores del rótulo.")

    blueprint(doc, 10, "Centro de cobros y recuperación",
        "Unir el registro de pagos ya diseñado en Admin con pagos del paciente y métricas de pérdida, sin confundir ambos circuitos.",
        "Trofenia aporta pagos fallidos e ingresos perdidos; Harbiz automatiza suscripciones; cheNutri muestra la demanda aunque su módulo esté en desarrollo.",
        ["Configurar servicios y reglas de pago/seña.", "Registrar pago manual o recibir estado del proveedor.", "Mostrar pendientes, rechazados, vencidos y recuperados.", "Reintentar o enviar recordatorio con política de frecuencia.", "Conciliar, exportar y auditar."],
        "charge, payment_attempt, provider_event, invoice, refund, reconciliation, reminder_policy.",
        "Separar facturación B2B de consultorios y cobros B2C de pacientes; webhooks firmados; importes inmutables después de confirmación.",
        "Webhook duplicado, pago parcial, moneda, devolución, contracargo, pago sin turno, turno cancelado, proveedor caído.",
        "MVP registro manual; fase 2 proveedor; fase 3 recuperación automatizada.",
        "Operaciones idempotentes; nunca se duplica un cobro; estados tienen fuente; cada cambio queda en historial y actualiza alertas.")

    blueprint(doc, 11, "IA embebida con niveles de autonomía",
        "Ahorrar tiempo en tareas repetitivas sin crear una caja negra clínica ni ejecutar cambios irreversibles.",
        "Harbiz usa IA como acción contextual; Nutri-Pro ofrece panel persistente/autónomo; Vitals IA la integra a fotos, planes y reportes.",
        ["El usuario inicia desde una tarea: plan, receta, resumen, reporte o mensaje.", "El sistema reúne sólo contexto autorizado y muestra fuentes.", "La IA entrega borrador y resalta campos inciertos.", "El profesional edita, aprueba o descarta.", "La acción final registra versión, modelo, prompt de sistema, fuentes y aprobador."],
        "ai_run, purpose, input_refs, output, confidence, policy_version, reviewer, final_entity_version, cost.",
        "Mínimo privilegio y aislamiento tenant; datos clínicos no se usan para entrenamiento por defecto; retención configurable; auditoría y borrado.",
        "Prompt injection en archivos, datos insuficientes, contradicciones, modelo no disponible, costo excedido, respuesta insegura.",
        "MVP receta/resumen; fase 2 plan con herramientas; fase 3 automatizaciones reversibles de bajo riesgo.",
        "Ningún contenido clínico se publica sin aprobación; toda salida identifica que fue asistida; existe alternativa manual; se pueden reproducir fuentes y versión.",
        "Modelo de autonomía recomendado: Nivel 0 consulta; Nivel 1 borrador; Nivel 2 propone acción; Nivel 3 ejecuta con confirmación; Nivel 4 sólo automatizaciones reversibles preautorizadas.")

    blueprint(doc, 12, "Academia y onboarding contextual",
        "Disminuir soporte y acelerar el primer resultado sin obligar al usuario a completar configuraciones irrelevantes.",
        "Nutreando aporta colecciones y progreso; Vitals IA y MuraTrack aportan pasos con tiempo estimado; Nutri-Pro aporta enlaces desde bloqueos.",
        ["Detectar rol y estado de cuenta.", "Mostrar tres próximos pasos con beneficio y duración.", "Abrir guía contextual sin abandonar la pantalla.", "Marcar progreso por acción real, no por hacer clic.", "Ofrecer academia searchable para aprendizaje profundo."],
        "onboarding_track, step, completion_event, role, dismissed_at, guide, product_version.",
        "El progreso es privado; admin puede ver métricas agregadas; no exponer actividad individual a otros consultorios.",
        "Función renombrada, paso imposible por plan, usuario invitado, acción ya hecha, tutorial obsoleto.",
        "MVP checklist por rol; fase 2 guías embebidas; fase 3 recomendaciones adaptativas.",
        "Cada paso tiene criterio automático; puede posponerse; nunca bloquea trabajo esencial; las guías se versionan con el producto.")

    page_break(doc)
    doc.add_heading("Priorización sugerida para NutriSoft", 1)
    para(doc, "La secuencia prioriza funciones que refuerzan el HITO Nutricionista sin forzar todavía integraciones o IA de alto riesgo.")
    add_table(doc, ["Horizonte", "Funciones", "Por qué ahora", "Dependencias"], [
        ["Ahora · Front validable", "Recetario, recursos, navegación, estados vacíos, launcher de acciones, estructura de feed y reporte.", "Permite validar lenguaje, jerarquía y flujos con datos ficticios.", "Design system, modelos mock, permisos representados."],
        ["Backend base", "Tenancy, roles, pacientes asignados, recursos/versiones, eventos, auditoría y archivos.", "Evita que el front consolide supuestos inseguros.", "Auth, RLS/policies, storage, event log."],
        ["MVP clínico", "Feed, biblioteca, recetas, reportes PDF y agenda interna.", "Crea un circuito profesional completo y demostrable.", "Datos clínicos, PDF, notificaciones básicas."],
        ["Crecimiento", "Perfil público, reservas, directorio, pagos e integraciones.", "Convierte la operación en adquisición y monetización.", "Consentimiento, SEO, proveedor de pagos/calendar."],
        ["IA controlada", "Formateo de recetas, resumen, reportes y extracción de rótulos.", "Automatiza sobre datos ya estructurados y auditables.", "Evaluaciones, observabilidad, costos, políticas."],
    ], [1.05, 2.3, 2.15, 1.35])
    doc.add_heading("Top 7 recomendado", 2)
    for i, x in enumerate([
        "Modelo de permisos y aislamiento multi-tenant antes de sincronizar recursos o recetas.",
        "Recetario con biblioteca del sistema, copias privadas, etiquetas, macros y publicación controlada.",
        "Recursos para pacientes propios con URLs seguras y versionado.",
        "Bandeja de atención basada inicialmente en reglas simples.",
        "Constructor de reportes con PDF, plantillas y firma.",
        "Agenda interna con tipos de consulta; reserva pública en fase siguiente.",
        "IA de borrador para recetas y reportes, con trazabilidad y aprobación obligatoria.",
    ], 1):
        p = doc.add_paragraph()
        add_run(p, f"{i}. ", bold=True, color=TEAL)
        add_run(p, x)

    callout(doc, "Decisión que conviene evitar", "No implementar primero un chat de IA genérico. Los competidores más convincentes insertan IA en tareas concretas, con contexto, salida estructurada y un resultado editable. El chat puede existir como acceso secundario, no como arquitectura principal.", RED, DARK)

    page_break(doc)
    doc.add_heading("Checklist de evaluación para futuras funciones", 1)
    para(doc, "Antes de incorporar una idea al roadmap, responder estas preguntas. Si faltan respuestas en permisos, datos o estados límite, la función todavía no está lista para desarrollo.")
    add_table(doc, ["Dimensión", "Preguntas"], [
        ["Usuario y problema", "¿Quién la usa? ¿Qué decisión o tarea mejora? ¿Cómo se resuelve hoy?"],
        ["Flujo", "¿Cuál es el disparador, el camino feliz, la confirmación y la salida?"],
        ["Datos", "¿Qué entidades necesita? ¿Cuál es la fuente de verdad? ¿Se versiona?"],
        ["Permisos", "¿Quién crea, lee, edita, comparte, aprueba y elimina? ¿Qué pasa al reasignar?"],
        ["Multi-tenant", "¿Qué filtros y políticas impiden cruces entre profesionales y consultorios?"],
        ["Clínica", "¿Es información, recomendación o decisión? ¿Requiere revisión profesional?"],
        ["IA", "¿Por qué IA y no reglas? ¿Qué fuentes usa? ¿Cómo se evalúa? ¿Se puede deshacer?"],
        ["Estados", "¿Vacío, cargando, error, sin permiso, sin plan, sin conexión, datos viejos?"],
        ["Auditoría", "¿Qué cambio debe conservar autor, fecha, antes/después y evidencia?"],
        ["Éxito", "¿Qué métrica demuestra valor sin incentivar comportamiento clínicamente pobre?"],
    ], [1.45, 5.25], small=False)

    doc.add_heading("Fuentes observadas y trazabilidad", 2)
    para(doc, "Plataformas auditadas: Nutrium, Nutreando, Nutri-Pro, Vitals IA, cheNutri, MuraTrack, Trofenia y Harbiz (sitio público y aplicación profesional). Se conservaron capturas de viewport y snapshots textuales en la carpeta local docs/competitive-research para permitir verificación interna.")
    para(doc, "Fecha de corte: 12 de agosto de 2026. Cualquier precio, límite, claim de IA o disponibilidad debe tratarse como temporal. La presencia de una opción en el menú no prueba por sí sola que esté completa, activa en todos los planes o disponible en producción.")
    callout(doc, "Uso ético", "Usar este informe para comprender problemas y patrones, no para copiar identidad visual, textos distintivos, contenido protegido ni flujos propietarios. La ventaja de NutriSoft debe surgir de una síntesis coherente con su arquitectura, su mercado y su estándar de privacidad.", LIGHT, BLUE)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
