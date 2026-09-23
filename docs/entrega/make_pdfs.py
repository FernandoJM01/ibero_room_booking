# -*- coding: utf-8 -*-
"""Genera el resumen del proyecto y la plantilla de credenciales (en blanco)."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon

OUT = "/Users/fernandojm/Downloads/UniversidadIberoamericana/Software/sala-juntas-ibero/docs/entrega/"
RED = colors.HexColor("#c8102e")
DARK = colors.HexColor("#222222")
GREY = colors.HexColor("#666666")
LIGHT = colors.HexColor("#f3f3f3")
LINE = colors.HexColor("#d0d0d0")

body = ParagraphStyle("body", fontName="Helvetica", fontSize=8.8, leading=11.6,
                      textColor=DARK, alignment=TA_LEFT, spaceAfter=3)
small = ParagraphStyle("small", parent=body, fontSize=7.6, leading=9.6, textColor=GREY)
h1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=21, leading=24,
                    textColor=RED, spaceAfter=1)
sub = ParagraphStyle("sub", fontName="Helvetica", fontSize=10.5, leading=13,
                     textColor=DARK, spaceAfter=4)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14,
                    textColor=RED, spaceBefore=7, spaceAfter=3)
cell = ParagraphStyle("cell", parent=body, fontSize=8.2, leading=10.4, spaceAfter=0)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold")
bullet = ParagraphStyle("bullet", parent=body, leftIndent=10, bulletIndent=0,
                        spaceAfter=1.6)


def P(t, s=body):
    return Paragraph(t, s)


def bullets(items, style=bullet):
    return [Paragraph(t, style, bulletText="•") for t in items]


def grid(data, widths, header=True):
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
          ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE)]
    if header:
        st += [("BACKGROUND", (0, 0), (-1, 0), RED),
               ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    t.setStyle(TableStyle(st))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.2)
    canvas.setFillColor(GREY)
    canvas.drawString(0.7 * inch, 0.45 * inch,
                      "IberoReservations · Ingeniería de Software 2026 · Universidad Iberoamericana CDMX")
    canvas.drawRightString(letter[0] - 0.7 * inch, 0.45 * inch, "Página %d" % doc.page)
    canvas.setStrokeColor(LINE)
    canvas.line(0.7 * inch, 0.6 * inch, letter[0] - 0.7 * inch, 0.6 * inch)
    canvas.restoreState()


# ---------------------------------------------------------------- diagrama
def box(d, x, y, w, h, title, sub_=None, fill=LIGHT, stroke=colors.HexColor("#999999"),
        tcolor=DARK):
    d.add(Rect(x, y, w, h, rx=4, ry=4, fillColor=fill, strokeColor=stroke, strokeWidth=0.8))
    if sub_:
        d.add(String(x + w / 2, y + h - 12, title, textAnchor="middle",
                     fontName="Helvetica-Bold", fontSize=7.8, fillColor=tcolor))
        d.add(String(x + w / 2, y + 6, sub_, textAnchor="middle",
                     fontName="Helvetica", fontSize=6.6, fillColor=GREY))
    else:
        d.add(String(x + w / 2, y + h / 2 - 3, title, textAnchor="middle",
                     fontName="Helvetica-Bold", fontSize=7.8, fillColor=tcolor))


def arrow(d, x1, y1, x2, y2, color=colors.HexColor("#555555")):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1))
    if abs(y2 - y1) < 0.1:
        s = 1 if x2 > x1 else -1
        d.add(Polygon([x2, y2, x2 - 5 * s, y2 + 3, x2 - 5 * s, y2 - 3],
                      fillColor=color, strokeColor=color))
    else:
        s = 1 if y2 > y1 else -1
        d.add(Polygon([x2, y2, x2 - 3, y2 - 5 * s, x2 + 3, y2 - 5 * s],
                      fillColor=color, strokeColor=color))


def diagrama():
    W, H = 512, 168
    d = Drawing(W, H)
    # Fila externa
    box(d, 8, 122, 100, 34, "Navegador", "usuario final")
    box(d, 156, 122, 150, 34, "Cloudflare Worker", "dominio deii-salas.uk")
    box(d, 354, 122, 150, 34, "Microsoft Dev Tunnel", "conexión saliente (443)")
    arrow(d, 108, 139, 156, 139)
    arrow(d, 306, 139, 354, 139)
    # Servidor
    d.add(Rect(8, 6, 496, 92, rx=6, ry=6, fillColor=colors.white,
               strokeColor=RED, strokeWidth=1.2, strokeDashArray=[4, 2]))
    d.add(String(16, 86, "Servidor institucional “reservadeii” · Ubuntu 24.04 · Docker Swarm (Dokploy)",
                 fontName="Helvetica-Bold", fontSize=7.4, fillColor=RED))
    box(d, 20, 22, 104, 44, "Traefik", "enrutador (dominio y /api)")
    box(d, 178, 40, 132, 30, "Web (Nginx)", "HTML, CSS y JavaScript")
    box(d, 178, 10, 132, 26, "API (Node.js)", None)
    box(d, 372, 22, 122, 44, "PostgreSQL 18", "volumen persistente")
    arrow(d, 124, 50, 178, 55)
    arrow(d, 124, 38, 178, 24)
    arrow(d, 310, 23, 372, 40)
    # Desde el túnel hacia Traefik
    arrow(d, 429, 122, 429, 100)
    d.add(Line(429, 100, 72, 100, strokeColor=colors.HexColor("#555555"), strokeWidth=1))
    arrow(d, 72, 100, 72, 66)
    d.add(String(250, 103, "HTTP :80", fontName="Helvetica", fontSize=6.4, fillColor=GREY,
                 textAnchor="middle"))
    return d


# ------------------------------------------------------------- resumen (2 p.)
def resumen():
    doc = SimpleDocTemplate(OUT + "Resumen_Proyecto_IberoReservations.pdf", pagesize=letter,
                            leftMargin=0.7 * inch, rightMargin=0.7 * inch,
                            topMargin=0.6 * inch, bottomMargin=0.75 * inch,
                            title="IberoReservations – Resumen del proyecto y del despliegue",
                            author="Equipo de desarrollo – Ingeniería de Software 2026")
    W = letter[0] - 1.4 * inch
    s = []
    s.append(P("IberoReservations", h1))
    s.append(P("Sistema de reservación de la sala de juntas · Universidad Iberoamericana CDMX", sub))
    s.append(P("<b>Curso:</b> Ingeniería de Software 2026 &nbsp;&nbsp; <b>Profesor:</b> Antonio Carlos Cardeña Matamoros<br/>"
               "<b>Líder de proyecto:</b> Wendy Elizabeth Guzmán Orta &nbsp;&nbsp; <b>Patrocinadora:</b> Julieta Esquinca Gómez<br/>"
               "<b>Producción:</b> https://deii-salas.uk &nbsp;&nbsp; <b>Código:</b> github.com/FernandoJM01/ibero_room_booking &nbsp;&nbsp; <b>Fecha:</b> 21 de septiembre de 2026",
               small))

    s.append(P("1. ¿Qué es?", h2))
    s.append(P("IberoReservations es una aplicación web para gestionar las reservaciones de la sala de juntas de la "
               "universidad. Sustituye el control manual por un calendario compartido que evita traslapes de horario, "
               "registra quién reservó y notifica por correo. Está en producción y accesible desde internet."))

    s.append(P("2. Funcionalidades principales", h2))
    izq = bullets([
        "<b>Roles:</b> secretaría, académico (consulta) y super administrador.",
        "<b>Calendario</b> mensual y semanal con <b>detección de traslapes</b> en tiempo real.",
        "<b>Reservaciones recurrentes</b> (semanal, quincenal y mensual).",
        "<b>Solicitudes de cambio</b> entre áreas y gestión de contactos externos.",
    ])
    der = bullets([
        "<b>Notificaciones</b> y recuperación de contraseña por correo (SMTP).",
        "<b>Historial, búsqueda, estadísticas</b> y exportación a PDF y Excel.",
        "<b>Respaldos</b> de la base de datos y retención automática de datos por 18 meses.",
        "<b>Seguridad base:</b> contraseñas con bcrypt, sesión JWT, límite de intentos y bitácora de auditoría.",
    ])
    t = Table([[izq, der]], colWidths=[W / 2, W / 2])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]))
    s.append(t)

    s.append(P("3. Tecnologías", h2))
    s.append(grid([
        [P("<b>Capa</b>", cellb), P("<b>Tecnología</b>", cellb)],
        [P("Interfaz", cell), P("HTML5, CSS3 y JavaScript sin framework, servido por Nginx", cell)],
        [P("API", cell), P("Node.js 20 y Express 4 (REST, autenticación JWT)", cell)],
        [P("Base de datos", cell), P("PostgreSQL 18", cell)],
        [P("Contenedores y despliegue", cell), P("Docker Swarm administrado con Dokploy; enrutamiento con Traefik 3.6", cell)],
        [P("Publicación en internet", cell), P("Microsoft Dev Tunnel y Cloudflare Worker (dominio deii-salas.uk)", cell)],
    ], [1.7 * inch, W - 1.7 * inch]))
    # cabecera con texto blanco
    s[-1].setStyle(TableStyle([("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]))

    s.append(P("4. Arquitectura en producción", h2))
    s.append(diagrama())
    s.append(P("El servidor <b>reservadeii</b> está en la red institucional y <b>no es accesible desde internet</b>. "
               "El tráfico llega por una conexión <b>saliente</b> (Dev Tunnel) y un Worker de Cloudflare que atiende el "
               "dominio público. Dentro del servidor, Traefik dirige cada petición a la web (Nginx) o a la API (Node.js), "
               "y la API consulta PostgreSQL."))

    # ----- página 2
    s.append(P("5. Retos de despliegue y decisiones", h2))
    s.append(grid([
        [P("<b>Reto</b>", cellb), P("<b>Decisión</b>", cellb)],
        [P("El servidor institucional no recibe conexiones desde internet.", cell),
         P("Publicar con una conexión saliente: Microsoft Dev Tunnel más un Worker de Cloudflare que da el dominio estable (ADR 0004).", cell)],
        [P("El puerto TCP 7844, que necesita <i>cloudflared</i>, está bloqueado (verificado con pruebas de red).", cell),
         P("Usar Dev Tunnel sobre el puerto 443, que la red sí permite (ADR 0003).", cell)],
        [P("Desplegar de forma repetible, sin comandos manuales sobre los contenedores.", cell),
         P("Dokploy sobre Docker Swarm: construye desde GitHub y reemplaza contenedores con actualización continua (ADR 0001).", cell)],
        [P("Varios nombres de dominio y rutas hacia la web y la API.", cell),
         P("Traefik enruta por dominio y por la ruta /api (ADR 0002).", cell)],
        [P("Los datos deben sobrevivir a cada despliegue.", cell),
         P("Base de datos en un servicio y un volumen independientes del código.", cell)],
    ], [2.6 * inch, W - 2.6 * inch]))
    s[-1].setStyle(TableStyle([("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]))

    s.append(P("6. Cómo se despliega una versión", h2))
    s.append(grid([
        [P("<b>1</b>", cellb), P("Se integra el cambio en la rama <b>main</b> de GitHub.", cell)],
        [P("<b>2</b>", cellb), P("En Dokploy se pulsa <b>Deploy</b>: se clona el repositorio y se construye la imagen en el servidor.", cell)],
        [P("<b>3</b>", cellb), P("Swarm inicia el contenedor nuevo antes de detener el anterior (política <i>start-first</i>), sin corte perceptible.", cell)],
        [P("<b>4</b>", cellb), P("Al arrancar, la API aplica las migraciones de la base de datos.", cell)],
        [P("<b>5</b>", cellb), P("Verificación: consulta a <i>/api/health</i> y prueba manual en https://deii-salas.uk.", cell)],
    ], [0.35 * inch, W - 0.35 * inch], header=False))

    s.append(P("7. Operación y continuidad", h2))
    s += bullets([
        "<b>Runbook</b> con procedimientos verificados: estado, registros, reinicio, respaldo y restauración, solución de problemas y reversa.",
        "<b>Recuperación automática:</b> los servicios se reinician solos y el túnel se administra con systemd (<i>Restart=always</i>, inicia con el servidor).",
        "<b>Reversa de código:</b> revertir el cambio en Git y volver a desplegar; la base de datos se restaura desde un respaldo.",
        "<b>Cambio de cuenta del túnel:</b> procedimiento documentado y ejecutado el 21 de septiembre de 2026, con prueba previa de extremo a extremo y plan de reversa.",
    ])

    s.append(P("8. Limitaciones conocidas y siguientes pasos", h2))
    s += bullets([
        "Servidor de un solo nodo: no hay alta disponibilidad.",
        "Dependencia de servicios externos (Cloudflare y Microsoft Dev Tunnels) con cuentas individuales; se documentan y se trasladarán a cuentas del equipo.",
        "Revisión de seguridad y endurecimiento del servidor en curso: cortafuegos, actualizaciones, respaldos automáticos fuera del servidor y monitoreo.",
        "Aún no existe una suite de pruebas automatizadas.",
    ])

    s.append(P("9. Documentación disponible en el repositorio", h2))
    s.append(grid([
        [P("<b>README.md</b>", cell), P("Ejecución local con Docker, variables de entorno y estructura del proyecto.", cell)],
        [P("<b>docs/DEPLOYMENT.md</b>", cell), P("Arquitectura de producción con diagrama, servicios, enrutamiento, base de datos y exposición a internet.", cell)],
        [P("<b>docs/RUNBOOK.md</b>", cell), P("Operación diaria, solución de problemas y reversa.", cell)],
        [P("<b>docs/adr/</b>", cell), P("Cuatro registros de decisiones de arquitectura (Dokploy, Traefik, restricciones de red y Worker).", cell)],
        [P("<b>docs/ACCESS.md</b>", cell), P("Registro de cuentas y responsables (sin contraseñas).", cell)],
    ], [1.7 * inch, W - 1.7 * inch], header=False))
    doc.build(s, onFirstPage=footer, onLaterPages=footer)


# ----------------------------------------------- plantilla de credenciales
def plantilla():
    doc = SimpleDocTemplate(OUT + "PLANTILLA_Hoja_de_acceso_evaluacion.pdf", pagesize=letter,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=0.8 * inch, bottomMargin=0.8 * inch,
                            title="Hoja de acceso para evaluación (plantilla en blanco)")
    W = letter[0] - 1.8 * inch
    s = []
    s.append(P("Hoja de acceso para evaluación", h1))
    s.append(P("IberoReservations · Ingeniería de Software 2026", sub))
    s.append(P("<b>Confidencial.</b> Entregar solo por un canal privado (correo institucional o mensaje directo), "
               "nunca en el repositorio ni en la documentación.", small))
    s.append(Spacer(1, 10))

    def fila(etq, val=""):
        return [P("<b>%s</b>" % etq, cell), P(val, cell)]
    datos = [
        fila("Sistema", "IberoReservations – reservación de sala de juntas"),
        fila("Dirección", "https://deii-salas.uk"),
        fila("Usuario (correo)", ""),
        fila("Contraseña temporal", ""),
        fila("Rol asignado", ""),
        fila("Vigencia hasta", ""),
        fila("Contacto", ""),
    ]
    t = Table(datos, colWidths=[1.7 * inch, W - 1.7 * inch], rowHeights=[24] * len(datos))
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                           ("BACKGROUND", (0, 0), (0, -1), LIGHT),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    s.append(t)

    s.append(P("Instrucciones", h2))
    s += bullets([
        "Inicie sesión con el usuario y la contraseña temporal.",
        "<b>Cambie la contraseña en su primer acceso</b> desde la opción de cambio de contraseña. Debe tener al menos 8 caracteres, con mayúsculas, minúsculas, un número y un símbolo.",
        "No comparta esta hoja ni la contraseña.",
        "Esta cuenta es solo para la evaluación y será <b>desactivada</b> al concluirla.",
        "Si no puede ingresar, use la opción “¿Olvidó su contraseña?” o escriba al contacto indicado.",
    ])
    doc.build(s, onFirstPage=lambda c, d: None, onLaterPages=lambda c, d: None)


if __name__ == "__main__":
    resumen()
    plantilla()
    print("ok")
