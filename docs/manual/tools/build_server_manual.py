# -*- coding: utf-8 -*-
"""Genera docs/manual/Manual_Administrador_Servidor.pdf (arquitectura, operación y recuperación del servidor).

    .venv/bin/python docs/manual/tools/build_server_manual.py

Todo lo marcado «Verificado» salió de la inspección en vivo del 2026-10-06 (UTC) con scripts/server-audit/collect.sh.
No contiene contraseñas ni direcciones privadas: las direcciones y cuentas se registran en la hoja de traspaso.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from manuallib import Manual, inch, RED, RED_DARK, INK, GREY  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Manual_Administrador_Servidor.pdf")
VER = "Versión 1.0 · Octubre de 2026 · Verificado en vivo el 6 de octubre de 2026 (UTC)"

# ───────────────────────── utilidades de dibujo ─────────────────────────
LIGHT = colors.HexColor("#f3f3f3")
BLUE = colors.HexColor("#2f80b7")
GREEN = colors.HexColor("#2e9e5b")
AMBER = colors.HexColor("#d98a00")
STROKE = colors.HexColor("#8a8a8a")


def box(d, x, y, w, h, title, sub=None, fill=LIGHT, stroke=STROKE, tcolor=INK, dash=None, size=7.8):
    d.add(Rect(x, y, w, h, rx=4, ry=4, fillColor=fill, strokeColor=stroke, strokeWidth=0.9, strokeDashArray=dash))
    if sub:
        d.add(String(x + w / 2, y + h - 11.5, title, textAnchor="middle", fontName="Helvetica-Bold", fontSize=size, fillColor=tcolor))
        for i, line in enumerate(sub if isinstance(sub, list) else [sub]):
            d.add(String(x + w / 2, y + h - 22 - i * 8.2, line, textAnchor="middle", fontName="Helvetica", fontSize=6.5, fillColor=GREY))
    else:
        d.add(String(x + w / 2, y + h / 2 - 3, title, textAnchor="middle", fontName="Helvetica-Bold", fontSize=size, fillColor=tcolor))


def arrow(d, x1, y1, x2, y2, color=colors.HexColor("#555555"), dash=None, both=False, label=None, lx=None, ly=None):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1.1, strokeDashArray=dash))
    import math
    ang = math.atan2(y2 - y1, x2 - x1)

    def head(x, y, a):
        s = 5.5
        d.add(Polygon([x, y, x - s * math.cos(a - 0.4), y - s * math.sin(a - 0.4), x - s * math.cos(a + 0.4), y - s * math.sin(a + 0.4)],
                      fillColor=color, strokeColor=color))
    head(x2, y2, ang)
    if both:
        head(x1, y1, ang + math.pi)
    if label:
        d.add(String(lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 + 3, label,
                     textAnchor="middle", fontName="Helvetica", fontSize=6.3, fillColor=GREY))


def num(d, x, y, n):
    d.add(Circle(x, y, 6.2, fillColor=RED, strokeColor=colors.white, strokeWidth=0.8))
    d.add(String(x, y - 2.5, str(n), textAnchor="middle", fontName="Helvetica-Bold", fontSize=7, fillColor=colors.white))


def zone(d, x, y, w, h, title, color=RED, right=False):
    d.add(Rect(x, y, w, h, rx=7, ry=7, fillColor=colors.white, strokeColor=color, strokeWidth=1.2, strokeDashArray=[4, 2]))
    if right:
        d.add(String(x + w - 8, y + h - 12, title, textAnchor="end", fontName="Helvetica-Bold", fontSize=7.4, fillColor=color))
    else:
        d.add(String(x + 8, y + h - 12, title, fontName="Helvetica-Bold", fontSize=7.4, fillColor=color))


# ───────────────────────── Figura 1: camino de una petición ─────────────────────────
def fig_request_path():
    d = Drawing(500, 262)
    d.add(String(8, 250, "INTERNET", fontName="Helvetica-Bold", fontSize=7.4, fillColor=BLUE))
    box(d, 8, 196, 88, 44, "Navegador", ["usuario final"], fill=colors.white)
    box(d, 132, 196, 148, 44, "Cloudflare", ["DNS deii-salas.uk", "Worker plain-glitter-53dd"], fill=colors.HexColor("#fdf1e3"), stroke=AMBER)
    box(d, 318, 196, 168, 44, "Relay Microsoft Dev Tunnels", ["túnel ibero-reservas.usw3", "(cuenta Microsoft individual)"], fill=colors.HexColor("#eaf3fa"), stroke=BLUE)
    arrow(d, 96, 218, 132, 218, label="HTTPS", lx=114, ly=222)
    arrow(d, 280, 218, 318, 218, label="HTTPS", lx=299, ly=222)
    num(d, 114, 232, 1); num(d, 299, 232, 2)

    zone(d, 8, 8, 484, 168, "Servidor reservadeii (red institucional): NO recibe conexiones desde internet", right=True)
    box(d, 20, 92, 112, 52, "devtunnel host", ["servicio systemd", "devtunnel-reservations", "usuario acardena"], fill=colors.HexColor("#eaf3fa"), stroke=BLUE)
    arrow(d, 76, 144, 400, 196, dash=[3, 2], color=BLUE, label="conexión SALIENTE por 443 (la abre el servidor)", lx=232, ly=186)
    num(d, 410, 188, 3)
    box(d, 168, 92, 86, 52, "Traefik", [":80 (y :443)", "enrutador"], fill=colors.HexColor("#fff5f5"), stroke=RED)
    arrow(d, 132, 118, 168, 118, label="HTTP :80", lx=150, ly=122)
    num(d, 150, 134, 4)
    box(d, 296, 108, 92, 36, "Web (Nginx)", ["contenedor :80"], fill=colors.white)
    box(d, 296, 58, 92, 36, "API (Node.js)", ["contenedor :3000"], fill=colors.white)
    arrow(d, 254, 128, 296, 128, label="/", lx=275, ly=132)
    arrow(d, 254, 108, 296, 80, label="/api", lx=268, ly=96)
    arrow(d, 342, 108, 342, 94, color=GREY)
    num(d, 275, 142, 5)
    box(d, 410, 58, 74, 86, "PostgreSQL 18", ["servicio", "+ volumen", "persistente"], fill=colors.white)
    arrow(d, 388, 76, 410, 90)
    num(d, 399, 98, 6)
    box(d, 20, 22, 156, 50, "Dokploy v0.30.2", ["panel :3000 (por túnel SSH)", "crea y configura los servicios"], fill=colors.HexColor("#f2f9f4"), stroke=GREEN)
    arrow(d, 176, 47, 296, 70, dash=[2, 2], color=GREEN)
    arrow(d, 176, 40, 210, 92, dash=[2, 2], color=GREEN)
    d.add(String(250, 16, "Dokploy construye y despliega los contenedores y escribe las rutas de Traefik", fontName="Helvetica", fontSize=6.3, fillColor=GREEN, textAnchor="middle"))
    return d


# ───────────────────────── Figura 2: el servidor por dentro ─────────────────────────
def fig_server_inside():
    d = Drawing(500, 292)
    zone(d, 4, 4, 492, 284, "reservadeii · Ubuntu 24.04.4 · 4 vCPU · 3,8 GiB RAM · disco 29 GB · reloj en UTC")
    # firewall
    d.add(Rect(12, 252, 476, 20, rx=3, ry=3, fillColor=colors.HexColor("#fdecec"), strokeColor=RED, strokeWidth=0.9))
    d.add(String(250, 258, "Cortafuegos ufw: permite 22 (SSH) · 80 · 443 · 3000 (panel Dokploy) · el resto, denegado", fontName="Helvetica-Bold", fontSize=7.2, fillColor=RED_DARK, textAnchor="middle"))
    # swarm: fila 1 = capa de aplicacion; fila 2 = datos y control
    zone(d, 12, 70, 340, 172, "Docker 28.5 · Swarm de un solo nodo · red overlay dokploy-network", color=BLUE)
    box(d, 22, 168, 96, 48, "dokploy-traefik", ["traefik v3.6.7", "80/443 publicados"], fill=colors.HexColor("#fff5f5"), stroke=RED)
    box(d, 132, 168, 96, 48, "web", ["imagen local :latest", "Nginx :80 (sin variables)"])
    box(d, 242, 168, 100, 48, "api", ["imagen local :latest", "Node :3000 · 17 variables"])
    arrow(d, 118, 192, 132, 192)
    box(d, 22, 106, 96, 48, "dokploy", ["v0.30.2 · :3000", "docker.sock + /etc/dokploy"], fill=colors.HexColor("#f2f9f4"), stroke=GREEN)
    box(d, 132, 106, 96, 48, "dokploy-postgres", ["postgres:16", "config de Dokploy"], fill=colors.HexColor("#f2f9f4"), stroke=GREEN)
    box(d, 242, 106, 100, 48, "base de datos", ["postgres:18", "3 variables"])
    arrow(d, 292, 168, 292, 154, label="SQL", lx=304, ly=159)
    # volumes: cada uno justo debajo de su servicio
    d.add(String(12, 62, "Volúmenes Docker (datos persistentes)", fontName="Helvetica-Bold", fontSize=6.8, fillColor=GREY))
    box(d, 22, 22, 96, 32, "dokploy", ["/root/.docker"], fill=colors.HexColor("#fffbea"), stroke=AMBER, size=6.8)
    box(d, 132, 22, 96, 32, "dokploy-postgres", ["config de Dokploy"], fill=colors.HexColor("#fffbea"), stroke=AMBER, size=6.8)
    box(d, 242, 22, 110, 32, "...-oi5kek-data", ["base de la aplicación (8,7 MB)"], fill=colors.HexColor("#fffbea"), stroke=AMBER, size=6.8)
    arrow(d, 70, 106, 70, 54, dash=[2, 2], color=AMBER)
    arrow(d, 180, 106, 180, 54, dash=[2, 2], color=AMBER)
    arrow(d, 292, 106, 292, 54, dash=[2, 2], color=AMBER)
    # host files
    zone(d, 362, 70, 126, 172, "Archivos del sistema", color=GREY)
    for i, (t, s) in enumerate([("/etc/dokploy/", "applications · logs · ssh"), ("  traefik/", "traefik.yml + dynamic/"), ("/etc/systemd/system/", "devtunnel-reservations"),
                                ("/home/acardena/", "bin · DevTunnels (login)"), ("/etc/ssh/ · ufw", "política SSH y firewall")]):
        yy = 214 - i * 28
        d.add(String(368, yy, t, fontName="Courier-Bold", fontSize=6.6, fillColor=INK))
        d.add(String(368, yy - 9, s, fontName="Helvetica", fontSize=6.2, fillColor=GREY))
    # systemd tunnel
    box(d, 362, 22, 126, 32, "devtunnel host", ["systemd · usuario acardena"], fill=colors.HexColor("#eaf3fa"), stroke=BLUE, size=7.2)
    return d


# ───────────────────────── Figura 3: flujo de despliegue ─────────────────────────
def fig_deploy():
    d = Drawing(500, 150)
    steps = [("Desarrollo", ["rama de trabajo", "pruebas locales"]), ("GitHub", ["rama main", "FernandoJM01/", "ibero_room_booking"]),
             ("Dokploy", ["botón Deploy", "(manual)"]), ("En el servidor", ["git clone en", "/etc/dokploy/", "applications/<svc>/code"]),
             ("Construcción", ["docker build", "imagen local :latest", "(sin registro)"])]
    x = 6
    for i, (t, s) in enumerate(steps):
        box(d, x, 76, 88, 56, t, s, fill=colors.HexColor("#fff5f5") if i == 2 else LIGHT, stroke=RED if i == 2 else STROKE)
        num(d, x + 10, 128, i + 1)
        if i < len(steps) - 1:
            arrow(d, x + 88, 104, x + 99, 104)
        x += 99
    box(d, 6, 8, 150, 50, "Actualización continua Swarm", ["start-first: el contenedor nuevo", "arranca antes de parar el viejo"], fill=colors.HexColor("#eaf3fa"), stroke=BLUE)
    box(d, 175, 8, 150, 50, "Al arrancar la API", ["aplica las migraciones SQL", "(idempotentes)"], fill=colors.white)
    box(d, 344, 8, 150, 50, "Si falla", ["rollback automático del servicio", "(misma imagen :latest, ver 9.3)"], fill=colors.HexColor("#fdecec"), stroke=RED)
    arrow(d, 440, 76, 82, 58, dash=[2, 2], color=BLUE)
    arrow(d, 156, 33, 175, 33); arrow(d, 325, 33, 344, 33)
    return d


# ───────────────────────── contenido ─────────────────────────
def build():
    m = Manual("Manual del Administrador del Servidor", "IberoReservations · Infraestructura",
               ["Manual del Administrador", "del Servidor"], "Arquitectura, operación y recuperación de reservadeii",
               VER)

    # ── 1
    m.h1("1. Introducción")
    m.p("Este manual describe cómo está construido y cómo se opera el servidor que aloja <b>IberoReservations</b> (el sistema de "
        "reservación de la sala de juntas de la Universidad Iberoamericana). Está escrito para la persona que <b>hereda la operación "
        "del servidor</b>: explica la arquitectura con diagramas, dónde vive cada configuración, cómo realizar las tareas habituales y qué "
        "hacer cuando algo falla.")
    m.h2("Cómo se verificó")
    m.p("El 6 de octubre de 2026 (UTC) se inspeccionó el servidor en vivo con el script de solo lectura "
        "<b>scripts/server-audit/collect.sh</b> y algunos comandos adicionales, como la cuenta <b>acardena</b> (las partes privilegiadas con "
        "<b>sudo</b>). El script no modifica nada y no imprime contraseñas: las variables de entorno aparecen solo por <b>nombre</b>. "
        "Cada dato de este manual proviene de esa inspección, salvo lo indicado como <b>registrado</b> (de la inspección del 21 de septiembre) o "
        "<b>no verificado</b>.")
    m.h2("Resumen ejecutivo")
    m.table(["Aspecto", "Estado verificado"], [
        ["Sitio público", "https://deii-salas.uk responde (HTTP 200) tras reiniciar el túnel el 6-oct-2026"],
        ["Código desplegado", "Commit <b>74efe0c</b> (versión con varias salas) en el servicio web y en la API; despliegue registrado el 6-oct-2026 a las 05:30 UTC"],
        ["Base de datos", "PostgreSQL 18.6, 8,7 MB: 8 usuarios, 16 reservaciones, migración de salas aplicada"],
        ["Respaldos", "<b>Solo existe una copia manual</b> del 24-sep-2026 (26 KB). No hay respaldos programados"],
        ["Vigilancia del túnel", "<b>Ninguna</b>: dos caídas (29 h y 91 h) pasaron sin aviso"],
        ["Acceso SSH", "Con contraseña; no hay llaves instaladas; el panel de Dokploy (puerto 3000) está abierto en el cortafuegos"],
        ["Actualizaciones", "38 paquetes pendientes (0 de seguridad) y <b>reinicio pendiente</b>"],
    ], [1.8, 5.7])
    m.warn("<b>Tres puntos críticos</b> (sección 10): (1) nadie vigila el túnel y el sitio puede caerse días sin que se note; (2) no hay respaldos "
           "automáticos fuera del servidor; (3) el acceso por contraseña y el panel de Dokploy abierto aumentan el riesgo de acceso no autorizado.")
    m.h2("Datos clave")
    m.table(["Dato", "Valor"], [
        ["Dirección pública", "https://deii-salas.uk (Cloudflare, Worker «plain-glitter-53dd»)"],
        ["Servidor", "reservadeii · Ubuntu 24.04.4 LTS · núcleo 6.8.0-139 · 4 vCPU · 3,8 GiB de RAM (+5,8 GiB de swap) · disco de 29 GB (62 % usado) · hora UTC"],
        ["Acceso", "SSH a través del servidor de salto <b>antares.dci.uia.mx</b>; cuentas con sudo: <b>acardena</b> y <b>admlocal</b>"],
        ["Contenedores", "Docker 28.5.0, Swarm de un nodo; Dokploy v0.30.2; Traefik v3.6.7; PostgreSQL 18 (aplicación) y 16 (Dokploy)"],
        ["Túnel", "Microsoft Dev Tunnels, ID <b>ibero-reservas.usw3</b>, servicio systemd <b>devtunnel-reservations</b>"],
        ["Repositorio", "github.com/FernandoJM01/ibero_room_booking (rama main)"],
    ], [1.6, 5.9])
    m.note("La dirección IP del servidor y las cuentas se registran en la <b>Hoja de traspaso de accesos</b> (PDF en blanco en docs/entrega/), "
           "no en este manual. Las contraseñas nunca se escriben en documentos: viven en el gestor de contraseñas del equipo.")

    # ── 2
    m.h1("2. Arquitectura")
    m.p("El servidor está en la red institucional y <b>no recibe conexiones desde internet</b>. Para publicar el sitio se usa una conexión "
        "<b>saliente</b> por el puerto 443 (un túnel de Microsoft) y un <i>Worker</i> de Cloudflare que atiende el dominio. Esta combinación se "
        "eligió porque la red institucional bloquea el puerto TCP 7844 que necesita Cloudflare Tunnel (ADR 0003).")
    m.drawing(fig_request_path(), "Camino de una petición, desde el navegador hasta la base de datos.")
    m.steps([
        "El navegador abre <b>https://deii-salas.uk</b>. Cloudflare resuelve el DNS y ejecuta el Worker.",
        "El Worker reescribe la dirección al <b>host del túnel</b> y pone ese nombre en la cabecera Host. No agrega autenticación ni caché.",
        "El relay de Microsoft entrega la petición por la conexión que el <b>servidor abrió hacia afuera</b> (devtunnel host, por el 443).",
        "<b>devtunnel host</b> la entrega a Traefik por HTTP en el puerto 80 del propio servidor.",
        "Traefik decide por regla: todo va al contenedor <b>web</b> (Nginx); las rutas <b>/api</b> del host del túnel van directo a la <b>API</b> (en deii-salas.uk, Nginx reenvía /api/ a la API).",
        "La API consulta <b>PostgreSQL</b> y responde por el mismo camino.",
    ])
    m.table(["Componente", "Función", "Dónde corre", "Quién lo administra"], [
        ["Cloudflare (DNS + Worker)", "Nombre público y proxy hacia el túnel", "Nube de Cloudflare", "Cuenta individual de Cloudflare"],
        ["Dev Tunnel (relay)", "Hace llegar el tráfico al servidor sin puertos abiertos", "Nube de Microsoft", "Cuenta Microsoft individual"],
        ["devtunnel host", "Mantiene la conexión saliente y entrega a Traefik", "Servidor, servicio systemd", "Administrador del servidor"],
        ["Traefik", "Enrutador: dominio y /api", "Contenedor dokploy-traefik", "Dokploy (pestaña Domains)"],
        ["Web (Nginx)", "Archivos estáticos y proxy de /api/", "Servicio Swarm", "Dokploy"],
        ["API (Node.js)", "Reglas del negocio, autenticación, correo", "Servicio Swarm", "Dokploy"],
        ["PostgreSQL 18", "Datos de la aplicación", "Servicio Swarm + volumen", "Dokploy"],
        ["Dokploy", "Panel que construye y despliega", "Servicio Swarm (puerto 3000)", "Administrador del servidor"],
    ], [1.5, 2.6, 1.8, 1.6])

    # ── 3
    m.h1("3. El servidor por dentro")
    m.drawing(fig_server_inside(), "Servicios, volúmenes y archivos de configuración en reservadeii.")
    m.h2("Recursos y red (verificado)")
    m.table(["Recurso", "Valor"], [
        ["Sistema", "Ubuntu 24.04.4 LTS, núcleo 6.8.0-139, encendido desde el 18-sep-2026 18:13 UTC"],
        ["CPU y memoria", "4 vCPU; 3,8 GiB de RAM (unos 1,7 GiB disponibles en la medición); swap 5,8 GiB"],
        ["Disco", "/ de 29 GB (LVM, ext4) al 62 %: 17 GB usados, 11 GB libres; /boot de 2 GB"],
        ["Red", "Una interfaz (eth0) con dirección privada institucional; Docker crea docker_gwbridge y docker0"],
        ["Puertos en escucha", "22 (sshd), 80 y 443 (Traefik), 3000 (Dokploy), 2377 y 7946 (Swarm), DNS local"],
        ["Cortafuegos (ufw)", "Activo. Entrada denegada por defecto; permite 22, 80, 443 y 3000 desde cualquier origen (IPv4 e IPv6)"],
        ["Hora", "UTC con sincronización NTP activa. Las bitácoras están en UTC; México está 6 horas atrás"],
        ["Docker", "28.5.0, almacenamiento overlay2, bitácoras json-file <b>sin rotación configurada</b>; imágenes 4,5 GB, volúmenes 136 MB"],
    ], [1.6, 5.9])
    m.h2("Usuarios y acceso SSH (verificado)")
    m.table(["Tema", "Estado"], [
        ["Cuentas con shell", "<b>acardena</b> (uid 1001) y <b>admlocal</b> (uid 1000); ambas con sudo. El grupo docker está vacío: Docker se usa con sudo"],
        ["Autenticación", "<b>Contraseña habilitada</b>; autenticación por llave habilitada pero <b>no hay llaves instaladas</b> (root, admlocal, acardena)"],
        ["Root", "Permitido solo por llave (y no hay llaves de root)"],
        ["Otros", "MaxAuthTries 6; X11Forwarding activo; /etc/sudoers.d solo contiene README"],
    ], [1.6, 5.9])

    # ── 4
    m.h1("4. Dokploy")
    m.p("<b>Dokploy</b> es el panel que crea las aplicaciones, construye las imágenes, define los dominios (rutas de Traefik) y guarda las "
        "variables de entorno. Corre como servicio Swarm (v0.30.2) y guarda <b>su propia configuración</b> en <b>dokploy-postgres</b> (PostgreSQL 16, "
        "volumen <b>dokploy-postgres</b>). Sus secretos internos son <i>Docker secrets</i> leídos como archivos (BETTER_AUTH_SECRET_FILE, "
        "POSTGRES_PASSWORD_FILE).")
    m.h2("Aplicaciones y servicios")
    m.table(["Servicio Swarm", "Imagen", "Variables (solo nombres)"], [
        ["iberoreservations-reservationsweb-rlrl5x", "local :latest (Nginx)", "ninguna"],
        ["iberoreservations-reservationsapi-6ulakn", "local :latest (Node 20)", "AI_API_KEY AI_MODEL AI_PROVIDER APP_URL DB_HOST DB_NAME DB_PASSWORD DB_PORT DB_USER JWT_EXPIRES_IN JWT_SECRET PORT SMTP_FROM SMTP_HOST SMTP_PASSWORD SMTP_PORT SMTP_USER"],
        ["iberoreservations-iberoreservationsdb-oi5kek", "postgres:18", "POSTGRES_DB POSTGRES_PASSWORD POSTGRES_USER"],
        ["dokploy", "dokploy/dokploy:v0.30.2", "BETTER_AUTH_SECRET_FILE POSTGRES_PASSWORD_FILE RELEASE_TAG"],
        ["dokploy-postgres", "postgres:16", "POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD_FILE"],
    ], [2.4, 1.5, 3.6])
    m.note("No están definidas <b>DATA_RETENTION_MONTHS</b> ni <b>APP_TIMEZONE</b>: se usan los valores por defecto del código (18 meses y "
           "America/Mexico_City). El servicio web usa una dirección de la API incorporada en su Dockerfile "
           "(BACKEND_URL=http://iberoreservations-reservationsapi-6ulakn:3000); si se recrea la API con otro nombre, hay que cambiarla.")
    m.warn("Los valores de las variables de la API y de la base de datos quedan en la especificación del servicio Swarm y los puede leer "
           "cualquiera que ejecute <b>docker service inspect</b> (es decir, quien tenga sudo). Por eso solo deben tener sudo personas de confianza.")
    m.h2("Cómo entrar al panel")
    m.p("El panel escucha en el puerto 3000 del servidor. Se recomienda entrar <b>por un túnel SSH</b> y no directamente:")
    m.code(["ssh -J <usuario>@antares.dci.uia.mx <cuenta>@<IP-del-servidor> -L 3001:127.0.0.1:3000",
            "# deja la sesion abierta y abre en el navegador:  http://localhost:3001",
            "# (usa 3001 si tu equipo ya usa el 3000 para desarrollo)"], "Túnel SSH hacia el panel")
    m.h2("Archivos de Dokploy en el disco (verificado)")
    m.table(["Ruta", "Contenido"], [
        ["/etc/dokploy/applications/<servicio>/code", "Clon de git de la rama main; de aquí se construye la imagen"],
        ["/etc/dokploy/logs/<servicio>/", "Una bitácora por cada despliegue (hay del 1-sep al 6-oct-2026)"],
        ["/etc/dokploy/traefik/", "traefik.yml y dynamic/*.yml (ver sección 5)"],
        ["/etc/dokploy/ssh/", "Llaves que usa Dokploy (modo 700, solo root). No se abrió durante la inspección"],
        ["/etc/dokploy/monitoring, schedules, volume-backups", "Métricas, tareas programadas y respaldos de volúmenes de Dokploy (sin configuración útil hoy)"],
    ], [2.9, 4.6])
    m.warn("<b>/etc/dokploy</b> tiene permisos <b>drwxrwxrwx</b> (cualquier usuario local puede escribir). Es el valor por defecto de Dokploy, pero "
           "permite que un usuario local reemplace la configuración de Traefik. Conviene restringirlo.")

    # ── 5
    m.h1("5. Traefik")
    m.p("Traefik v3.6.7 corre como contenedor <b>dokploy-traefik</b> (reinicio siempre) y publica los puertos 80 y 443 (TCP y UDP). Su configuración "
        "estática está en <b>/etc/dokploy/traefik/traefik.yml</b>: proveedores swarm, docker y archivos; puntos de entrada web (:80) y websecure (:443); "
        "el panel de Traefik (api.insecure) está activo pero <b>no se publica</b>. El archivo de certificados acme.json está vacío: el TLS lo terminan "
        "Cloudflare y el túnel, no el servidor, y el correo de ACME es un valor de ejemplo.")
    m.h2("Rutas definidas (verificado el 6-oct-2026)")
    m.table(["Regla (Host)", "Ruta", "Destino", "Estado"], [
        ["deii-salas.uk", "cualquiera", "web :80", "En uso (Nginx reenvía /api/ a la API)"],
        ["npbkpmwc-80.usw3.devtunnels.ms", "cualquiera y /api", "web :80 y API :3000", "<b>En uso</b> (túnel actual)"],
        ["localhost", "cualquiera y /api", "web :80 y API :3000", "Pruebas en el propio servidor"],
        ["5x0zgl8x-80.usw3.devtunnels.ms", "cualquiera y /api", "web :80 y API :3000", "<b>Túnel retirado</b>: eliminar"],
        ["reservas.local", "cualquiera", "API :8080", "<b>Puerto equivocado, obsoleta</b>: eliminar"],
        ["dokploy.docker.localhost", "cualquiera", "dokploy :3000", "Panel (nombre local)"],
    ], [2.2, 1.4, 1.5, 2.4])
    m.p("Las rutas las <b>genera Dokploy</b> a partir de la pestaña <b>Domains</b> de cada aplicación. Edita los dominios allí, no los archivos "
        "a mano (se sobrescriben al guardar). Para comprobar una ruta sin pasar por internet:")
    m.code(["curl -s -H 'Host: npbkpmwc-80.usw3.devtunnels.ms' http://127.0.0.1/api/health"], "Salud de la API a través de Traefik (en el servidor)")

    # ── 6
    m.h1("6. Dev Tunnel (túnel de Microsoft)")
    m.h2("Cómo funciona")
    m.p("El servicio <b>devtunnel-reservations</b> (systemd) ejecuta <b>/home/acardena/bin/devtunnel host ibero-reservas.usw3 --allow-anonymous</b> con "
        "el usuario <b>acardena</b>. Abre una conexión saliente hacia el relay de Microsoft y recibe por ella las peticiones del puerto 80. Está "
        "habilitado al arranque, con <b>Restart=always</b> y espera de 5 s.")
    m.table(["Propiedad", "Valor verificado"], [
        ["Unidad", "/etc/systemd/system/devtunnel-reservations.service (copia previa: ~/devtunnel-reservations.service.bak)"],
        ["Programa", "devtunnel 1.0.2030 en /home/acardena/bin/"],
        ["Identificador y URL", "ibero-reservas.usw3 · https://npbkpmwc-80.usw3.devtunnels.ms (puerto 80, solo HTTP hacia el servidor)"],
        ["Acceso", "Conexión anónima permitida (cualquiera con la URL puede entrar); límite de 20 MB/s"],
        ["Caducidad", "Ventana deslizante de 30 días que se renueva con actividad (26,4 días al medir)"],
        ["Cuenta propietaria", "Una cuenta institucional Microsoft (correo.uia.mx), la misma que inició sesión con devtunnel"],
        ["Credenciales", "Caché de inicio de sesión en /home/acardena/DevTunnels/ (archivos devtunnels-tokens*, modo 600)"],
        ["cloudflared", "Instalado pero <b>deshabilitado</b>; quedan archivos sobrantes en el home de acardena"],
    ], [1.6, 5.9])
    m.h2("Incidente: el túnel «funciona» pero el sitio está caído")
    m.p("Se observó dos veces: el proceso sigue en estado <i>active (running)</i> pero <b>desconectado</b>. La bitácora muestra «Error connecting host tunnel "
        "session: Not authorized. Refreshed tunnel access token is not valid». Como el proceso nunca termina, systemd no lo reinicia.")
    m.table(["Fecha (UTC)", "Qué ocurrió", "Duración aproximada"], [
        ["29-sep-2026 01:30", "Conexión perdida y token no válido; restaurado con un reinicio manual el 30-sep a las 06:13", "29 horas"],
        ["2-oct-2026 10:06", "Mismo error; restaurado el 6-oct a las 05:32 reiniciando el proceso", "91 horas (casi 4 días)"],
    ], [1.5, 4.6, 1.4])
    m.h3("Cómo detectarlo")
    m.code(["# 'Host connections : 0' = DESCONECTADO (1 = bien)",
            "/home/acardena/bin/devtunnel show ibero-reservas.usw3",
            "# busca 'Not authorized' en la bitacora",
            "journalctl -u devtunnel-reservations -n 20 --no-pager",
            "# la aplicacion responde en local (descarta que sea la app):",
            "curl -s -H 'Host: npbkpmwc-80.usw3.devtunnels.ms' http://127.0.0.1/api/health"], "Como acardena, sin sudo")
    m.h3("Cómo repararlo (verificado el 6-oct-2026)")
    m.code(["# detiene solo ese proceso; systemd lo vuelve a levantar en ~5 s",
            "pid=$(systemctl show devtunnel-reservations -p MainPID --value); kill -TERM \"$pid\"",
            "# alternativa con sudo:",
            "sudo systemctl restart devtunnel-reservations",
            "# comprobar (debe decir 'Host connections : 1' y {\"ok\":true,...}):",
            "sleep 15; /home/acardena/bin/devtunnel show ibero-reservas.usw3 | grep 'Host connections'",
            "curl -s https://deii-salas.uk/api/health"])
    m.p("Si vuelve a fallar enseguida con «Not authorized», la sesión de Microsoft caducó: como <b>acardena</b> ejecuta "
        "<b>devtunnel user login -d</b>, completa el inicio de sesión con el código en un navegador usando la cuenta propietaria y reinicia el servicio.")
    m.h3("Cómo se evita ahora")
    m.p("Desde el <b>6-oct-2026</b> hay vigilancia automática (sección 6.1). El <b>monitor externo</b> (UptimeRobot, inicio de sesión con la cuenta Microsoft p18731@correo.uia.mx) ya está configurado y su único contacto de alerta es p18731@correo.uia.mx; guía en <b>docs/EXTERNAL_MONITOR.md</b>. A mediano plazo, pedir a TI una publicación estable sin depender de una cuenta individual.")

    m.h2("6.1 Vigilancia automática: watchdog, correos y respaldos (instalado el 6-oct-2026)")
    m.p("No modifica la aplicación, Docker, Dokploy, Traefik, la unidad del túnel, el Worker ni Cloudflare: solo agrega temporizadores en el servidor. "
        "Guía completa: <b>docs/WATCHDOG_AND_BACKUPS.md</b>.")
    m.table(["Pieza", "Qué hace", "Cuándo"], [
        ["<b>Watchdog</b> (devtunnel-watchdog.timer)", "Consulta /api/health por el túnel. Tras 2 fallas seguidas, si la aplicación responde en local, reinicia solo devtunnel-reservations (máximo cada 10 min)", "Cada 2 minutos"],
        ["<b>Avisos por correo</b> (devtunnel-notify.sh)", "Envía correo con la cuenta SMTP que ya tiene la aplicación (no guarda contraseñas en el servidor)", "Cuando hay recuperación, falla persistente, app caída o respaldo fallido"],
        ["<b>Respaldo nocturno</b> (ibero-db-backup.timer)", "pg_dump comprimido en /var/backups/ibero/, verificado, 14 días de retención", "02:00 UTC (20:00 CDMX)"],
        ["<b>Archivo de ajustes</b>", "/etc/default/ibero-alerts: destinatarios (ALERT_TO) y URL opcional de latido", "Se lee en cada ejecución"],
    ], [1.9, 4.2, 1.4])
    m.h3("Dónde cambiar los correos")
    m.code(["sudo nano /etc/default/ibero-alerts",
            "# cambia la línea ALERT_TO (direcciones separadas por coma, sin espacios):",
            "#   ALERT_TO=p18731@correo.uia.mx,a231592a@correo.uia.mx",
            "# no hay que reiniciar nada; para probar:",
            "sudo /usr/local/sbin/devtunnel-notify.sh \"[IberoReservas] TEST\" \"Prueba\""], "Destinatarios (watchdog y respaldo)")
    m.p("El monitor externo, cuando exista, tiene su propia lista de destinatarios en su panel: cámbiala también.")
    m.h3("Qué significa cada correo")
    m.table(["Asunto", "Significado", "Qué hacer"], [
        ["RECOVERED", "El sitio volvió; indica cuánto estuvo caído", "Nada. Si se repite cada pocos días, avisar al responsable del proyecto"],
        ["ACTION NEEDED", "Dos reinicios automáticos no bastaron; casi siempre caducó la sesión de Microsoft", "Como acardena: devtunnel user login -d (la cuenta propietaria aprueba el código) y sudo systemctl restart devtunnel-reservations"],
        ["ALERT: the application is down", "El túnel está bien pero la API/Traefik/BD no; no se reinicia el túnel", "Revisar servicios Swarm y bitácoras (sección 14)"],
        ["ALERT: nightly database backup FAILED", "No se completó el respaldo de la noche", "journalctl -t ibero-db-backup; ejecutar sudo /usr/local/sbin/db-backup.sh"],
    ], [1.9, 2.9, 2.7])
    m.h3("Comandos de uso diario")
    m.code(["# ¿están activos los temporizadores?",
            "systemctl list-timers devtunnel-watchdog.timer ibero-db-backup.timer --no-pager",
            "# decisiones del watchdog del último día",
            "sudo journalctl -t devtunnel-watchdog --since '1 day ago' --no-pager",
            "# revisar ahora (sin salida = sano)",
            "sudo /usr/local/sbin/devtunnel-watchdog.sh",
            "# pausar y volver a activar (¡no olvidar activarlo!)",
            "sudo systemctl stop devtunnel-watchdog.timer",
            "sudo systemctl start devtunnel-watchdog.timer",
            "# respaldos disponibles y respaldo inmediato",
            "sudo ls -lh /var/backups/ibero/",
            "sudo /usr/local/sbin/db-backup.sh"], "Estado y operación")
    m.p("<b>Prueba de falla realizada el 6-oct-2026:</b> se congeló el proceso del túnel a las 06:36:52 UTC; el sitio estuvo caído hasta las 06:40:17 (unos 3,5 minutos), "
        "el watchdog lo reinició solo y llegó el correo RECOVERED a las dos personas. Límite: no puede renovar una sesión de Microsoft caducada ni detectar la caída "
        "del servidor completo (para eso sirve el monitor externo).")

    # ── 7
    m.h1("7. Cloudflare y el dominio")
    m.p("Cloudflare aporta tres cosas: el <b>DNS</b> de deii-salas.uk, el <b>Worker</b> «plain-glitter-53dd» y la terminación de HTTPS hacia los visitantes. "
        "Las respuestas públicas confirman el paso por Cloudflare (<i>server: cloudflare</i>, <i>cf-ray</i>, HSTS y <i>x-content-type-options</i>).")
    m.table(["Elemento", "Dónde se configura", "Detalle"], [
        ["Worker plain-glitter-53dd", "Panel de Cloudflare › Workers &amp; Pages › Edit code", "El script <b>solo existe allí</b>: reescribe la URL al host del túnel y fija la cabecera Host. Hay una copia en docs/DEPLOYMENT.md"],
        ["Dominio personalizado", "Workers › Domains", "deii-salas.uk apunta al Worker. La URL workers.dev también está habilitada (segunda entrada pública)"],
        ["DNS y registrador", "Cloudflare (zona deii-salas.uk)", "El <b>registrador, el titular y la fecha de renovación no están documentados</b>"],
        ["Cuenta", "Cuenta individual institucional", "Agregar a compañeros en Manage Account › Members y activar verificación en dos pasos"],
    ], [1.7, 2.4, 3.4])
    m.note("Cuando cambie el host del túnel (por ejemplo, al migrar la cuenta propietaria) hay que actualizar el Worker y las rutas de Dokploy: "
           "procedimiento en docs/RUNBOOK.md, «Change the account that owns the Dev Tunnel».")
    m.warn("<b>No se verificó</b> el contenido del panel de Cloudflare (no hubo acceso a la cuenta). Quien tenga acceso debe confirmar el script del "
           "Worker, los registros DNS y los miembros de la cuenta, y anotarlo en docs/ACCESS.md.")

    # ── 8
    m.h1("8. Base de datos y datos")
    m.table(["Dato", "Valor verificado (6-oct-2026)"], [
        ["Motor", "PostgreSQL 18.6, servicio iberoreservations-iberoreservationsdb-oi5kek"],
        ["Datos", "Volumen iberoreservations-iberoreservationsdb-oi5kek-data, montado en /var/lib/postgresql/18/docker"],
        ["Tamaño", "8,7 MB; 11 tablas"],
        ["Contenido (solo conteos)", "8 usuarios (6 secretaría, 2 académico; 2 super administradores; 1 inactivo) · 16 reservaciones (14 activas, 2 canceladas) del 21-sep al 4-dic-2026 · 2 contactos externos · 7 fechas marcadas · 43 entradas de historial · 31 registros de correo (enviados y fallidos)"],
        ["Migraciones", "Se aplican solas en cada arranque de la API (001 a 009 en el código); la tabla rooms y reservations.room_id ya existen"],
        ["Retención", "La API borra a diario registros de más de 18 meses (reservaciones, historial, registro de correos, fechas marcadas)"],
    ], [1.8, 5.7])
    m.h2("Respaldos")
    m.warn("Desde el 6-oct-2026 hay un <b>respaldo nocturno automático</b> en /var/backups/ibero/ (14 días; ver sección 6.1), pero está en <b>el mismo disco</b> que la base: "
           "falta decidir dónde copiarlo fuera del servidor. Dokploy tampoco está respaldado: si se pierde su base, las aplicaciones y dominios hay que recrearlos.")
    m.code(["# Respaldo manual de la base de la aplicacion (en el servidor)",
            "sudo docker exec $(sudo docker ps -qf \"name=iberoreservationsdb\") \\",
            "  sh -c 'pg_dump --clean --if-exists -U \"$POSTGRES_USER\" \"$POSTGRES_DB\"' \\",
            "  > backup_$(date +%F).sql",
            "# Cópialo FUERA del servidor (scp) y guárdalo cifrado; contiene datos personales."], "Respaldo")
    m.p("La restauración y la reversa de la migración de salas están en <b>docs/RUNBOOK.md</b> (secciones «Restore a backup» y «Roll back the database»). "
        "La precarga de reservaciones desde Excel y la limpieza previa están en <b>docs/DATA_MIGRATION.md</b>.")

    # ── 9
    m.h1("9. Despliegue y reversa")
    m.drawing(fig_deploy(), "Cómo llega un cambio de código a producción.")
    m.h2("9.1 Desplegar")
    m.steps(["Fusionar el cambio en la rama <b>main</b> de GitHub.",
             "En Dokploy, abrir cada aplicación afectada (reservationsapi y/o reservationsweb) y pulsar <b>Deploy</b>.",
             "Esperar el cierre del despliegue (hay una bitácora en /etc/dokploy/logs/&lt;servicio&gt;/) y revisar la salud:",
             ])
    m.code(["curl -s https://deii-salas.uk/api/health          # {\"ok\":true,...}",
            "sudo docker service ls                            # los servicios en 1/1",
            "# commit desplegado:",
            "git -c safe.directory='*' -C /etc/dokploy/applications/<servicio>/code log -1 --oneline"])
    m.p("El despliegue reemplaza solo los contenedores web y API (actualización <i>start-first</i>); la base de datos no se toca y sus datos persisten. "
        "<b>Respalda antes de cualquier despliegue que agregue migraciones.</b> Los navegadores guardan los .js y .css un año: el código incrementa el número "
        "?v=N de los archivos; si un usuario ve una pantalla vieja, que recargue con Ctrl+Mayús+R.")
    m.h2("9.2 Reversa de código")
    m.p("Las imágenes son locales y siempre <b>:latest</b> (no hay registro): revertir significa <b>reconstruir una versión anterior</b>. "
        "Reviértase el commit en GitHub (git revert) y pulse Deploy de nuevo.")
    m.h2("9.3 Reversa automática de Swarm")
    m.p("Si el contenedor nuevo no arranca, Swarm restaura la definición anterior del servicio (<i>rollback</i>). Como usa la misma etiqueta :latest, "
        "no sustituye a la reversa de código de 9.2.")
    m.h2("9.4 Migraciones")
    m.p("Son idempotentes y <b>no son reversibles</b>. La migración 009 (salas) hace obligatorio reservations.room_id: tras aplicarla, una versión anterior del "
        "código no puede crear reservaciones. Reversa segura y probada: quitar la obligatoriedad con <i>ALTER TABLE reservations ALTER COLUMN room_id DROP NOT NULL</i> "
        "antes de redesplegar la versión vieja (detalle en docs/changes/2026-09-27-multi-room-support.md).")

    # ── 10
    m.h1("10. Seguridad: hallazgos y acciones")
    m.p("Ordenados por prioridad. Ninguno se ha corregido todavía: son decisiones del equipo.")
    m.table(["Prioridad", "Hallazgo (verificado)", "Riesgo", "Acción recomendada"], [
        ["Mitigado", "Túnel sin vigilancia (caídas de 29 h y 91 h)", "Sitio caído sin aviso", "Watchdog instalado y probado el 6-oct-2026; monitor externo (UptimeRobot) configurado el 6-oct-2026"],
        ["<b>Alta</b>", "Respaldo nocturno instalado, pero en el mismo disco; Dokploy sin respaldo", "Pérdida de datos y de configuración", "Copiar los respaldos fuera del servidor; probar la restauración"],
        ["<b>Alta</b>", "SSH con contraseña, sin llaves, X11 activo; root por llave permitido", "Adivinar contraseñas desde la red institucional", "Instalar llaves, PasswordAuthentication no, PermitRootLogin no, X11Forwarding no (probar en una segunda sesión)"],
        ["<b>Alta</b>", "Puerto 3000 (panel de Dokploy) permitido a cualquier origen", "Panel de administración expuesto", "Restringirlo y seguir usando el túnel SSH; Docker también publica puertos por iptables"],
        ["Media", "Cuenta sudo <b>admlocal</b> sin propietario registrado", "Cuenta administrativa desconocida", "Registrar al responsable o deshabilitarla"],
        ["Media", "38 actualizaciones pendientes y reinicio pendiente", "Núcleo sin actualizar", "Ventana de mantenimiento; revisar el túnel después"],
        ["Media", "/etc/dokploy con permisos 777; variables visibles con docker service inspect", "Cambios no autorizados; fuga de secretos", "Restringir permisos; limitar quién tiene sudo"],
        ["Media", "Cuentas individuales de Microsoft y Cloudflare; registrador sin documentar", "Dependencia de una persona", "Segunda persona con acceso y verificación en dos pasos; registrar renovación"],
        ["Baja", "Bitácoras de Docker sin rotación; rutas obsoletas; ACME de ejemplo; archivos sobrantes de cloudflared; .bash_history de 44 KB", "Disco lleno; desorden; posibles secretos en el historial", "daemon.json con límite de log; limpiar rutas y archivos; revisar el historial"],
        ["Baja", "Ubuntu Pro no asociado", "Sin soporte extendido", "Opcional: decidir con TI si conviene contratar o asociar el soporte extendido"],
    ], [0.7, 2.3, 1.7, 2.8])

    # ── 11
    m.h1("11. Operación")
    m.h2("Rutinas")
    m.table(["Cuándo", "Qué hacer"], [
        ["Cada día (o con monitor)", "Comprobar https://deii-salas.uk/api/health; si no responde, ver la sección 6 y la 14"],
        ["Cada semana", "Copiar el respaldo más reciente fuera del servidor; revisar docker service ls y df -h; leer los correos del watchdog si los hubo"],
        ["Cada mes", "Instalar actualizaciones y reiniciar en una ventana acordada; revisar usuarios con sudo y llaves; revisar la caducidad del túnel"],
        ["Cada semestre", "Revisar ACCESS.md y la hoja de traspaso; probar una restauración de respaldo; rotar credenciales compartidas por canales inseguros"],
        ["Antes de entregas o evaluaciones", "Comprobar túnel, salud pública, respaldo reciente y que haya al menos dos personas con acceso"],
    ], [2.0, 5.5])
    m.h2("Comandos de diagnóstico (solo lectura)")
    m.code(["sudo docker service ls                                  # servicios 1/1",
            "sudo docker service ps iberoreservations-reservationsapi-6ulakn   # historial de tareas",
            "sudo docker service logs --tail 100 iberoreservations-reservationsapi-6ulakn",
            "sudo docker logs --tail 100 dokploy-traefik",
            "systemctl status devtunnel-reservations --no-pager",
            "journalctl -u devtunnel-reservations -n 50 --no-pager",
            "df -h /; free -h; uptime",
            "sudo ufw status verbose; sudo ss -tlnp",
            "apt list --upgradable 2>/dev/null | wc -l; ls /var/run/reboot-required"], "Estado general")
    m.p("Para un informe completo y sin contraseñas ejecuta <b>sudo bash collect.sh | tee ~/server-audit-$(date +%F).md</b> "
        "(scripts/server-audit/). Revisa el informe antes de compartirlo.")

    # ── 12
    m.h1("12. Procedimientos paso a paso")
    m.h2("12.1 Conectarse al servidor")
    m.code(["ssh -J <usuario>@antares.dci.uia.mx <cuenta>@<IP-del-servidor>",
            "# Docker requiere sudo en este servidor: anteponer 'sudo' a los comandos docker"])
    m.h2("12.2 Reiniciar un servicio sin redesplegar")
    m.code(["sudo docker service update --force iberoreservations-reservationsapi-6ulakn"])
    m.p("Reemplaza el nombre para web o base de datos. La API y el web usan start-first (no hay corte). <b>Evita reiniciar la base de datos en horas de uso</b>: corta las conexiones.")
    m.h2("12.3 Agregar o quitar a un administrador del servidor")
    m.steps(["Crear la cuenta personal (no compartir cuentas) e instalar su <b>llave SSH</b>.",
             "Agregarla al grupo sudo solo si necesita administrar; registrar nombre, fecha y responsable en ACCESS.md y en la hoja de traspaso.",
             "Al salir una persona: deshabilitar su cuenta y su llave, quitarla de Dokploy, Cloudflare, GitHub y Microsoft, y <b>rotar</b> los secretos que conocía (sección 13).",
             "Actualizar la lista de revisión semestral."])
    m.h2("12.4 Rotar secretos")
    m.table(["Secreto", "Dónde se cambia", "Efecto y precauciones"], [
        ["JWT_SECRET", "Dokploy › API › Environment, luego Deploy", "Cierra la sesión de todos los usuarios"],
        ["DB_PASSWORD / POSTGRES_PASSWORD", "Cambiar en PostgreSQL <b>y</b> en las variables de la API y de la base, y redesplegar", "Hacerlo en una ventana: la API pierde la conexión hasta redesplegar"],
        ["SMTP_PASSWORD", "Dokploy › API › Environment, luego Deploy", "Sin correos mientras no se despliegue"],
        ["Sesión de Microsoft (túnel)", "devtunnel user login -d como acardena", "Reiniciar el servicio después"],
        ["Contraseñas de personas", "Administración › Usuarios de la aplicación", "Ver el Manual del Administrador de la aplicación"],
    ], [2.0, 2.7, 2.8])

    # ── 13
    m.h1("13. Manejo de credenciales")
    m.p("Las credenciales son la parte más delicada de la herencia de un servidor. La regla es simple: <b>este manual y el repositorio nunca contienen "
        "contraseñas</b>; solo dicen qué cuenta existe y dónde está su secreto.")
    m.bullets(["<b>Una sola fuente de verdad:</b> un gestor de contraseñas compartido con al menos dos personas. Nunca chats, correos, tickets ni capturas.",
               "<b>Hoja de traspaso:</b> usar el PDF en blanco «Hoja de traspaso de accesos del servidor» (docs/entrega/). Trae cada sistema con el usuario y la "
               "columna de contraseña <b>vacía a propósito</b>; el valor se entrega por el gestor y por un canal distinto al del usuario.",
               "<b>Credenciales temporales:</b> se usan una vez, caducan y se cambian en el primer acceso; se registra la fecha de entrega, no el valor.",
               "<b>Llaves y verificación en dos pasos</b> en lugar de contraseñas siempre que sea posible (SSH, Microsoft, Cloudflare, GitHub, registrador).",
               "<b>Si un secreto se filtra</b> (chat, commit, captura): se considera comprometido; se rota primero y después se limpia el lugar donde apareció."])
    m.table(["Credencial", "Cuenta (sin valor)", "Dónde vive el secreto"], [
        ["Servidor (SSH)", "acardena, admlocal", "Gestor de contraseñas (y llaves SSH)"],
        ["Servidor de salto", "cuenta institucional personal", "Gestor de contraseñas"],
        ["Dokploy (panel)", "administrador de Dokploy", "Gestor de contraseñas"],
        ["Túnel de Microsoft", "cuenta correo.uia.mx", "Gestor + caché en /home/acardena/DevTunnels/"],
        ["Cloudflare, registrador, GitHub", "cuentas individuales", "Gestor + verificación en dos pasos"],
        ["API y base de datos", "variables JWT_SECRET, DB_*, SMTP_*, AI_API_KEY", "Variables de Dokploy + gestor"],
        ["Secretos internos de Dokploy", "Docker secrets", "Servidor (no se necesitan a diario)"],
    ], [2.0, 2.6, 2.9])

    # ── 14
    m.h1("14. Solución de problemas")
    m.table(["Síntoma", "Causa probable", "Qué comprobar o hacer"], [
        ["El sitio no abre (sin respuesta)", "Túnel desconectado (sección 6) o Cloudflare", "devtunnel show › «Host connections»; reiniciar el proceso; revisar el estado de Cloudflare"],
        ["Página de Cloudflare con error", "Túnel caído o caducado", "systemctl status devtunnel-reservations; journalctl; relogin si dice «Not authorized»"],
        ["Traefik responde «404 page not found»", "Ninguna ruta coincide con la cabecera Host", "Revisar las rutas (sección 5) y que el Worker envíe el host del túnel actual"],
        ["«502 Bad Gateway»", "Contenedor web o API detenido", "sudo docker service ls y service ps; revisar bitácoras"],
        ["La página carga pero todas las llamadas fallan", "API o base de datos caídas", "Bitácoras de la API; curl a /api/health por Traefik"],
        ["No se puede iniciar sesión tras un reinicio de datos", "El seed restauró la contraseña inicial", "docs/DEPLOYMENT.md §4; cambiar la contraseña de inmediato"],
        ["No llegan correos", "SMTP vacío o con error", "Pestaña Notificaciones de la aplicación; SMTP_ADMIN_GUIDE.md"],
        ["Interfaz vieja tras un despliegue", "Caché del navegador (un año)", "Ctrl+Mayús+R; comprobar que se subió el ?v=N"],
        ["«permission denied» al usar Docker", "El usuario no está en el grupo docker", "Usar sudo docker ..."],
        ["No se abre el panel de Dokploy", "Túnel SSH caído o puerto 3000 ocupado en tu equipo", "Repite el túnel con otro puerto local (3001)"],
        ["Disco casi lleno", "Bitácoras de Docker sin rotación, imágenes antiguas", "docker system df; configurar rotación; docker image prune (con cuidado)"],
    ], [2.2, 2.2, 3.1])

    # ── Anexos
    m.h1("Anexo A. Documentos relacionados")
    m.table(["Documento", "Para qué"], [
        ["docs/SERVER_CONFIGURATION.md", "Dónde vive cada configuración y qué se pierde si cae el servidor (versión técnica de este manual)"],
        ["docs/DEPLOYMENT.md", "Arquitectura de producción, historial de cambios y observaciones"],
        ["docs/RUNBOOK.md", "Procedimientos: túnel, respaldos, restauración, reversa, límite de intentos"],
        ["docs/ACCESS.md", "Registro de cuentas, responsables y estándar de credenciales"],
        ["docs/DATA_MIGRATION.md", "Precarga de reservaciones y limpieza de datos"],
        ["docs/SMTP_ADMIN_GUIDE.md", "Configuración y diagnóstico del correo"],
        ["docs/adr/", "Decisiones de arquitectura (Dokploy, Traefik, red, Worker de Cloudflare)"],
        ["scripts/server-audit/", "Inventario de solo lectura del servidor"],
        ["infra/tunnel-watchdog/", "Propuesta de vigilancia automática del túnel (sin instalar)"],
    ], [2.6, 4.9])
    m.h2("Glosario")
    m.table(["Término", "Significado"], [
        ["Swarm", "Modo de Docker para administrar servicios; aquí un solo nodo"],
        ["Servicio", "Aplicación gestionada por Swarm (web, API, base de datos)"],
        ["Traefik", "Enrutador que decide a qué servicio va cada petición"],
        ["Dokploy", "Panel que construye, despliega y configura los servicios"],
        ["Dev Tunnel", "Servicio de Microsoft que expone un puerto local por internet con una conexión saliente"],
        ["Worker", "Programa pequeño que corre en Cloudflare delante del sitio"],
        ["start-first", "Estrategia de actualización: arranca el contenedor nuevo antes de detener el viejo"],
        ["Docker secret", "Secreto entregado a un contenedor como archivo"],
    ], [1.6, 5.9])
    return m


if __name__ == "__main__":
    build().build(OUT)
    print("generado", os.path.basename(OUT))
