# -*- coding: utf-8 -*-
"""Genera los tres manuales de usuario (PDF) a partir del texto de este archivo y de docs/manual/img/.

    .venv/bin/python docs/manual/tools/build_manuals.py [secretaria|academico|administrador]

Los números en círculos rojos de cada captura se explican en la lista numerada que la acompaña;
si cambias una captura (capture_*.py) revisa también esa lista.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manuallib import Manual, inch, small  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
VERSION = "Versión 1.0 · Octubre de 2026"
DEMO = "Las capturas usan datos ficticios de demostración."


# ════════════════════════════════════════════════════════════════════════════
#  SECCIONES COMUNES (se reutilizan en los tres manuales)
# ════════════════════════════════════════════════════════════════════════════
def acceso(m, rol):
    m.h2("Entrar al sistema")
    m.steps([
        "Abre la dirección del sistema que te dio la universidad en tu navegador (Chrome, Edge, Firefox o Safari).",
        "Escribe tu <b>correo institucional</b> <b>(1)</b> y tu <b>contraseña</b> <b>(2)</b>. Con el ícono del ojo <b>(3)</b> puedes ver lo que escribes.",
        "Pulsa <b>Iniciar Sesión</b> <b>(4)</b>.",
    ])
    m.fig("common_login", "Pantalla de inicio de sesión.", max_w=3.4 * inch, max_h=3.4 * inch)
    m.legend(["Correo institucional.", "Contraseña.", "Mostrar u ocultar la contraseña.", "Botón para entrar.",
              "Enlace para recuperar la contraseña."])
    m.note("Después de <b>5 intentos fallidos</b> seguidos el sistema bloquea nuevos intentos durante <b>15 minutos</b>. "
           "Si te pasa, espera ese tiempo o pide ayuda a la secretaría. Los accesos correctos no cuentan como intentos fallidos.")
    m.note("Por seguridad, la sesión se cierra sola tras <b>30 minutos sin actividad</b>. Basta con volver a entrar; "
           "lo que no hayas guardado en un formulario se pierde.")

    m.h2("Si olvidaste tu contraseña")
    m.steps([
        "En la pantalla de inicio pulsa <b>¿Olvidaste tu contraseña?</b> <b>(5)</b>.",
        "Escribe tu correo institucional y pulsa <b>Enviar instrucciones</b>.",
        "Abre el correo que recibirás y pulsa el enlace. Es válido por <b>60 minutos</b>.",
        "Escribe tu contraseña nueva dos veces y guarda.",
    ])
    m.fig("common_forgot", "Recuperación de contraseña.", max_w=3.4 * inch, max_h=3.4 * inch)
    m.tip("Si el correo no llega (revisa también la carpeta de spam), es posible que el servicio de correo esté apagado. "
          + ("Pide a un Super Administrador que te asigne una contraseña nueva desde <b>Usuarios</b>."
             if rol != "academico" else "Pide a la secretaría que te asigne una contraseña nueva."))

    m.h2("Cambiar tu contraseña")
    m.steps([
        "Pulsa tu nombre en la esquina inferior izquierda <b>(1)</b>. Se abre un pequeño menú.",
        "Elige <b>Cambiar Contraseña</b> <b>(2)</b>.",
        "Escribe tu contraseña actual, la nueva y la confirmación, y pulsa <b>Guardar</b>.",
    ])
    m.fig("common_profile_menu", "Menú de tu cuenta (abajo a la izquierda).", max_w=3.0 * inch, max_h=2.6 * inch)
    m.legend(["Tu nombre y rol: pulsa aquí para abrir el menú.", "Cambiar Contraseña.", "Cerrar Sesión (salir)."])
    m.fig("common_change_password", "Ventana para cambiar la contraseña.", max_w=3.6 * inch, max_h=3.4 * inch)
    m.warn("La contraseña nueva debe tener <b>al menos 8 caracteres</b> e incluir <b>una mayúscula, una minúscula, "
           "un número y un símbolo</b> (por ejemplo, <i>Mate#2027x</i>). No la compartas con nadie.")
    m.p("Para salir del sistema usa siempre <b>Cerrar Sesión</b> (3), sobre todo en computadoras compartidas.")


def celular(m, rol):
    m.p("El sistema se adapta a la pantalla del teléfono. Abre el menú con el botón de <b>tres rayitas</b> de la esquina "
        "superior izquierda; ahí están las mismas opciones que en la computadora.")
    m.fig("mob_secretaria", "Vista en celular: pantalla principal, menú lateral e Historial.", max_h=3.6 * inch)
    m.tip("En el celular las tablas se desplazan de lado a lado con el dedo. Para ver todo el calendario semanal "
          "es más cómodo girar el teléfono en horizontal.")


# ════════════════════════════════════════════════════════════════════════════
#  MANUAL DE LA SECRETARIA
# ════════════════════════════════════════════════════════════════════════════
def secretaria():
    m = Manual("Manual de la Secretaria", "IberoReservations · Sala de Juntas",
               ["Manual de la", "Secretaria"], "Guía paso a paso para quien administra las reservaciones",
               VERSION + " · " + DEMO)

    # ── 1
    m.h1("1. Bienvenida")
    m.p("<b>IberoReservations</b> es el sistema con el que la universidad reserva sus salas de juntas. Reemplaza el control "
        "manual por un <b>calendario compartido</b>: todos ven el mismo calendario, el sistema <b>avisa si dos juntas se "
        "traslapan en la misma sala</b>, guarda quién reservó y quién modificó cada cosa, y envía correos de confirmación.")
    m.p("Este manual está pensado para una <b>secretaria que usa el sistema por primera vez</b>. Primero aprenderás lo "
        "esencial (entrar y hacer una reservación) y después las demás herramientas. No necesitas conocimientos técnicos.")
    m.h2("Lo esencial en cinco minutos")
    m.steps([
        "Entra con tu correo y contraseña (sección 2).",
        "En <b>Reservar</b>, elige la <b>sala</b> y pasa a la vista <b>Semana</b> (sección 3).",
        "<b>Arrastra</b> sobre las horas libres y pulsa <b>Reservar selección</b> (sección 4).",
        "Elige la sala, el responsable y escribe el <b>nombre de la junta</b>; pulsa <b>Guardar reservación</b>.",
        "Para corregir o cancelar, haz clic en la reservación (sección 5) o usa el <b>Historial</b> (sección 6).",
    ])
    m.h2("Quién puede hacer qué")
    m.table(["", "Académico", "Secretaria", "Super Administrador"], [
        ["Ver su calendario y su historial", "Sí (solo lo suyo)", "Sí (todo)", "Sí (todo)"],
        ["Crear, editar, mover y cancelar reservaciones", "No", "Sí", "Sí"],
        ["Historial completo, estadísticas y exportaciones", "Solo su historial", "Sí", "Sí"],
        ["Crear y desactivar usuarios", "No", "Sí (no Super Administradores)", "Sí"],
        ["Marcar festivos y cierres", "No", "Sí", "Sí"],
        ["Fechas del semestre, salas, respaldos, diagnóstico de correo", "No", "No", "Sí"],
    ], [3.2, 1.5, 1.8, 1.8])
    m.note("Tú eres <b>Secretaria</b>. Si necesitas algo de la última fila (por ejemplo, dar de alta una sala nueva), "
           "pídeselo a un Super Administrador; el <b>Manual del Administrador</b> explica cómo lo hace.")

    # ── 2
    m.h1("2. Primeros pasos")
    acceso(m, "secretaria")
    m.h2("Conoce la pantalla")
    m.p("A la izquierda está el <b>menú</b>. Arriba está la barra con el título de la página, la <b>sala</b> que estás viendo, "
        "el botón de ayuda (?) y tu rol.")
    m.fig("common_sidebar_secretaria", "Menú lateral de la Secretaria.", max_w=2.7 * inch, max_h=3.6 * inch)
    m.legend(["<b>Reservar</b>: el calendario donde se crean y consultan las reservaciones.",
              "<b>Historial</b>: lista completa para buscar, filtrar, editar, cancelar y exportar.",
              "<b>Estadísticas</b>: indicadores y gráficas de uso.",
              "<b>Usuarios</b>: altas y bajas de personas y contactos externos.",
              "<b>Festivos / Cierres</b>: días marcados en el calendario.",
              "<b>Notificaciones</b>: registro de los correos que envió el sistema."])
    m.h3("Más espacio: contraer el menú")
    m.p("En la computadora puedes <b>contraer el menú</b> para que solo muestre íconos y así ver más calendario. Hazlo con el "
        "botón de tres rayitas de la barra superior, con la pequeña flecha que aparece en el borde del menú al pasar el "
        "mouse, o con el teclado: <b>Ctrl + B</b> (en Mac, <b>Cmd + B</b>). El sistema recuerda tu elección.")
    m.fig("common_sidebar_collapsed", "Menú contraído: al pasar el mouse sobre un ícono aparece su nombre.", max_h=3.6 * inch)
    m.h3("Tutorial de bienvenida")
    m.p("La primera vez que entras aparece un recorrido guiado. Puedes avanzar con <b>Siguiente</b>, saltarlo con "
        "<b>Saltar</b> y volver a verlo cuando quieras con el botón <b>?</b> de la barra superior de la pantalla <b>Reservar</b>.")
    m.fig("common_tutorial_1", "Tutorial interactivo (primer paso).", max_h=3.3 * inch)

    # ── 3
    m.h1("3. El calendario «Reservar»")
    m.h2("La pantalla principal")
    m.fig("sec_dashboard", "Pantalla Reservar (vista mensual).", max_h=4.3 * inch)
    m.legend(["<b>Resumen</b> de la sala elegida: reservaciones del mes, activas en los próximos 7 días, de hoy y recurrentes.",
              "<b>Selector de sala</b>. Cada sala tiene su propio calendario (ver abajo).",
              "<b>Mes / Semana</b>: cambia la vista.",
              "Flechas para ir al periodo anterior o siguiente, y <b>Hoy</b> para volver a la fecha actual.",
              "El <b>calendario</b>. Cada franja roja es una reservación.",
              "<b>Mini calendario</b>: haz clic en una fecha para saltar a esa semana.",
              "<b>Próximas reservaciones</b> de la sala; «Ver todas» abre el Historial.",
              "<b>Leyenda</b> de colores."])
    m.h2("Elegir la sala")
    m.p("El selector de sala (2) está en la <b>parte superior derecha</b> (en el celular aparece dentro de la tarjeta del "
        "calendario). Todo lo que ves —calendario, resumen y próximas reservaciones— corresponde a <b>una sola sala a la vez</b>. "
        "El sistema recuerda la última sala que elegiste en ese navegador.")
    m.warn("Las salas son independientes: dos juntas pueden ocurrir a la misma hora si son en salas distintas. "
           "El sistema solo avisa de traslapes dentro de la <b>misma sala</b>.")
    m.h2("Significado de los colores")
    m.table(["Color", "Qué significa", "¿Se puede reservar?"], [
        ["Rojo", "Reservación activa", "El horario ocupado no; el resto del día sí"],
        ["Morado", "Reservación que forma parte de una serie recurrente", "Igual que el rojo"],
        ["Azul verdoso", "Hoy", "Sí"],
        ["Amarillo", "<b>Festivo</b>: solo resalta la fecha", "<b>Sí</b>"],
        ["Gris", "<b>Cierre institucional</b>", "<b>No</b>: el día está bloqueado"],
        ["Azul", "Evento informativo", "Sí"],
    ], [1.3, 3.6, 2.6])
    m.p("Además, los <b>domingos</b> nunca se reservan. Los <b>sábados</b> sí, a menos que alguien los marque como cierre. "
        "El horario disponible va de <b>7:00 a 21:00</b>, en bloques de media hora.")

    # ── 4
    m.h1("4. Hacer una reservación")
    m.h2("Paso a paso")
    m.steps([
        "Elige la <b>sala</b> en el selector superior.",
        "Cambia a la vista <b>Semana</b> y ve a la semana que necesitas. (En la vista Mes, al hacer clic en un día el sistema te lleva a la semana de ese día.)",
        "<b>Arrastra</b> con el mouse sobre las horas libres de un día. Se pintan de azul y arriba aparece la barra de selección.",
        "Pulsa <b>Reservar selección</b>. Se abre el formulario.",
        "Completa el formulario (ver más abajo) y pulsa <b>Guardar reservación</b>.",
    ])
    m.fig("sec_week", "Vista semanal: las franjas rojas son reservaciones; el resto es horario libre.", max_h=3.7 * inch)
    m.fig("sec_week_selected", "Horas seleccionadas y barra de acción.", max_h=3.9 * inch)
    m.legend(["Barra de selección: indica cuántos bloques elegiste y el total de horas.",
              "Las horas seleccionadas (en azul).", "<b>Reservar selección</b>: abre el formulario."])
    m.tip("Para elegir <b>varios horarios</b> (por ejemplo, el martes y el jueves), mantén presionada la tecla "
          "<b>Ctrl</b> (o <b>Mayús</b>) mientras haces clic en cada bloque. <b>Limpiar</b> borra la selección.")

    m.h2("El formulario «Nueva reservación»")
    m.fig("sec_modal_filled", "Formulario completo.", max_h=6.2 * inch, max_w=3.7 * inch)
    m.legend(["<b>Sala</b> (obligatoria). Aunque estés viendo una sala en el calendario, elígela aquí otra vez.",
              "<b>Hora de inicio y de fin</b>; puedes ajustarlas.",
              "<b>Aviso de disponibilidad</b>: «Horario disponible» o el nombre de quien ya ocupa esa franja.",
              "<b>Tipo de responsable</b>: usuario interno o solicitante externo.",
              "<b>Responsable</b> de la junta (obligatorio).",
              "<b>Nombre de la junta</b> (obligatorio): por ejemplo «Revisión de presupuesto 2027».",
              "<b>Observaciones</b> (opcional): material, quién asiste, etc.",
              "Casilla para que se repita (ver sección 4.4).",
              "<b>Guardar reservación</b>."])
    m.h3("Aviso de traslape")
    m.p("Mientras eliges sala y horas, el sistema revisa la disponibilidad <b>en esa sala</b>. Si el horario ya está "
        "ocupado verás en rojo «Traslape con …» y el nombre de la persona; cambia la hora o la sala. Si no has elegido sala, "
        "aparece «Elige una sala para ver disponibilidad». No es posible guardar una reservación que se traslape.")

    m.h2("Varios horarios en una sola reservación")
    m.p("Si seleccionaste varios bloques, el formulario muestra una fila por cada uno y usa la misma sala, responsable y "
        "nombre para todos. Se crea una reservación por cada fila; los traslapes se revisan en cada una y, si alguna falla, "
        "no se guarda ninguna.")
    m.fig("sec_modal_multi", "Formulario con dos horarios seleccionados.", max_h=5.0 * inch, max_w=3.5 * inch)

    m.h2("Responsable externo o persona sin usuario")
    m.bullets([
        "<b>Solicitante externo</b>: elige esa opción en «Tipo de responsable». Selecciona un contacto existente o crea uno nuevo con nombre, correo y organización.",
        "<b>Persona de la universidad que aún no tiene usuario</b>: en la lista «Responsable» elige <b>+ Crear nuevo usuario…</b> y llena nombre, correo, rol y contraseña. Ver la sección 8.1 sobre contraseñas.",
    ])
    m.fig("sec_modal_external", "Opción «Solicitante Externo».", max_h=4.2 * inch, max_w=3.5 * inch)

    m.h2("Reservaciones recurrentes")
    m.p("Para una junta que se repite (por ejemplo, todos los miércoles), selecciona <b>un solo horario</b>, abre el "
        "formulario y marca <b>Reservación recurrente</b>. Esta opción <b>no aparece</b> si seleccionaste varios horarios.")
    m.fig("sec_modal_recurring", "Opciones de recurrencia con la vista previa de fechas.", max_h=6.3 * inch, max_w=3.7 * inch)
    m.legend(["<b>Frecuencia</b>: diaria, semanal, quincenal o mensual.",
              "<b>Terminar</b>: después de cierto número de repeticiones, en una fecha específica o al final del semestre actual.",
              "<b>Número de repeticiones</b> (de 2 a 52).",
              "<b>Vista previa</b>: las fechas exactas que se crearán, antes de guardar."])
    m.note("Se omiten automáticamente los <b>domingos</b>, los <b>cierres institucionales</b> y las fechas en que la sala "
           "ya está ocupada. La vista previa y el aviso final te dicen cuántas se omitieron y por qué. "
           "La opción «al final del semestre» requiere que un Super Administrador haya configurado las fechas del semestre.")

    m.h2("¿Qué pasa al guardar?")
    m.bullets([
        "La reservación aparece de inmediato en el calendario y en el Historial.",
        "Si el servicio de correo está activo y la persona responsable tiene correo, recibe una <b>confirmación</b> con sala, fecha y horario.",
        "Queda registrado quién la creó.",
    ])

    # ── 5
    m.h1("5. Consultar, editar, mover y cancelar")
    m.h2("Ver el detalle")
    m.p("Haz clic en una reservación del calendario. Se abre una ventana con la fecha, el horario, el responsable, el "
        "nombre de la junta, quién la registró y su estado, además de los botones <b>Editar</b> y <b>Cancelar</b>.")
    m.fig("sec_popup", "Detalle de una reservación.", max_h=3.2 * inch, max_w=3.8 * inch)
    m.h2("Editar")
    m.steps(["Abre el detalle y pulsa <b>Editar</b> (o usa el botón de lápiz en el Historial).",
             "Cambia lo necesario: sala, horario, responsable, nombre u observaciones.",
             "Pulsa <b>Guardar cambios</b>."])
    m.fig("sec_edit_modal", "Edición de una reservación.", max_h=5.2 * inch, max_w=3.5 * inch)
    m.p("Cualquier secretaria puede editar cualquier reservación. Quedará registrado quién hizo el cambio y qué cambió "
        "(ver «Ver cambios» en el Historial). Si cambia algo relevante, el responsable recibe un correo; y si lo editó "
        "otra persona, también se avisa a la secretaria que la creó.")
    m.h2("Cancelar")
    m.steps(["Abre el detalle y pulsa <b>Cancelar</b> (o el botón <b>X</b> rojo en el Historial).",
             "Confirma en la ventana de advertencia."])
    m.fig("sec_cancel_confirm", "Confirmación de cancelación.", max_h=2.2 * inch, max_w=4.4 * inch)
    m.warn("Cancelar <b>no se puede deshacer</b>. La reservación no se borra: pasa a estado «Cancelada» y sigue en el "
           "Historial, y se avisa por correo al responsable. Para recuperar el horario hay que crear una reservación nueva.")
    m.h2("Mover arrastrando")
    m.p("En la vista semanal puedes <b>arrastrar</b> una reservación a otro horario o día. El sistema pregunta "
        "<b>«¿Confirmar movimiento?»</b> mostrando la nueva fecha y hora; confirma o cancela. Si el horario nuevo está ocupado "
        "lo avisa y no mueve nada. Si la reservación pertenece a una serie recurrente, te pregunta si quieres mover "
        "<b>solo esa instancia</b> o <b>toda la serie</b> (a la misma hora).")
    m.h2("Menú de clic derecho (vista semanal)")
    m.p("Con el botón derecho del mouse sobre una reservación puedes <b>copiarla</b> o <b>cortarla</b>; luego, clic derecho "
        "en un espacio libre y elige <b>Pegar aquí</b> (o <b>Mover aquí</b>, si la cortaste). En un espacio libre también puedes "
        "<b>ir a la vista mensual</b> o <b>marcar el día como festivo</b>.")
    m.fig("sec_ctx_reservation", "Clic derecho sobre una reservación.", max_h=1.1 * inch, max_w=2.6 * inch)
    m.fig("sec_ctx_cell", "Clic derecho en un espacio libre.", max_h=1.2 * inch, max_w=2.6 * inch)

    # ── 6
    m.h1("6. Historial")
    m.p("El <b>Historial</b> muestra todas las reservaciones (activas y canceladas) y es la herramienta para buscar, "
        "corregir y sacar reportes.")
    m.fig("sec_hist_full", "Pantalla del Historial.", max_h=4.4 * inch)
    m.legend(["<b>Buscar</b> por texto. El selector de la derecha limita la búsqueda a un campo (responsable, nombre de la junta, creado por u observaciones).",
              "<b>Fechas</b>: abre atajos como «Hoy», «Esta semana» o «Este mes», o un rango propio.",
              "<b>Sala</b>: muestra solo una sala.",
              "<b>Filtros</b>: opciones extra (por ahora, tipo de responsable: interno o externo).",
              "<b>Pestañas de estado</b> con contador: Todas, Activas y Canceladas.",
              "<b>Exportar</b> a Excel, PDF o CSV.",
              "La <b>tabla</b>. Pulsa el título de una columna para ordenar por ella.",
              "<b>Política de retención</b>: los registros se conservan 18 meses."])
    m.h2("Buscar y filtrar")
    m.fig("sec_hist_dates", "Atajos y rango de fechas.", max_h=4.2 * inch)
    m.legend(["Atajos de fecha.", "Fechas «Desde» y «Hasta» para un rango propio."])
    m.p("Los filtros se combinan. Cada filtro activo aparece como una <b>etiqueta</b> debajo de la barra; pulsa su <b>x</b> "
        "para quitarlo, o <b>Limpiar</b> para empezar de cero. Los contadores de las pestañas respetan los demás filtros.")
    m.fig("sec_hist_filtered", "Filtros activos: fechas, tipo de responsable y estado «Activas».", max_h=3.8 * inch)
    m.legend(["Botón de fechas resaltado (hay un rango aplicado).", "Botón de filtros extra, con un contador.",
              "Etiquetas de los filtros activos.", "<b>Limpiar</b> quita todos los filtros.",
              "Contador de la pestaña seleccionada."])
    m.h2("Acciones en cada fila")
    m.fig("sec_hist_row", "Botones de una fila.", max_h=1.4 * inch)
    m.legend(["<b>Ver cambios</b>: historial de la reservación. Un <b>puntito azul</b> indica que fue modificada o cancelada después de crearse.",
              "<b>Editar</b>.", "<b>Cancelar</b>."])
    m.fig("sec_hist_changes", "«Historial de cambios»: quién creó o modificó la reservación, cuándo y qué cambió.", max_h=3.4 * inch, max_w=4.8 * inch)
    m.h2("Cancelar varias a la vez")
    m.steps(["Marca las casillas de las reservaciones <b>activas</b> que quieras cancelar (o la casilla de la cabecera para marcarlas todas).",
             "Aparece la barra roja con el total. Pulsa <b>Cancelar seleccionadas</b>.",
             "Confirma. Se avisa por correo a cada responsable."])
    m.fig("sec_hist_bulk", "Selección múltiple.", max_h=3.3 * inch)
    m.legend(["Barra de acciones masivas.", "<b>Cancelar seleccionadas</b>.", "Casilla para seleccionar todas las activas."])
    m.h2("Exportar reportes")
    m.p("Los botones <b>Excel</b>, <b>PDF</b> y <b>CSV</b> exportan <b>lo que estás viendo</b> (con los filtros y el orden "
        "actuales). El nombre del archivo incluye los filtros aplicados.")
    m.bullets(["<b>PDF</b> y <b>Excel</b> traen un encabezado con el título, los <b>filtros aplicados</b>, quién lo generó y cuándo, y el total de registros.",
               "<b>CSV</b> trae solo los datos, sin encabezado, para quien quiera procesarlos en otro programa."])
    m.fig("sec_export_pdf", "Primera página de un PDF exportado.", max_h=4.3 * inch, max_w=5.0 * inch)

    # ── 7
    m.h1("7. Estadísticas")
    m.p("La página <b>Estadísticas</b> resume el uso de las salas en un periodo.")
    m.fig("sec_stats", "Pantalla de Estadísticas.", max_h=4.3 * inch)
    m.legend(["<b>Periodo y sala</b>: elige «Desde», «Hasta» y la sala, y pulsa <b>Aplicar</b>. «Este año» restablece el periodo.",
              "<b>Indicadores</b>: total, activas, canceladas y recurrentes.",
              "<b>Ocupación mensual</b> y otras gráficas (nombres de junta más frecuentes, activas contra canceladas).",
              "<b>Exportar el reporte</b> del periodo en Excel, PDF o CSV."])

    # ── 8
    m.h1("8. Administración que puedes hacer")
    m.p("El grupo <b>Administración</b> del menú te da acceso a tres pestañas. La pestaña <b>Salas</b> y la de "
        "<b>Respaldos</b> son solo del Super Administrador.")
    m.h2("8.1 Usuarios")
    m.fig("sec_users", "Pestaña Usuarios.", max_h=3.8 * inch)
    m.legend(["Pestañas de Administración.", "<b>Usuarios Internos</b> y <b>Contactos Externos</b>.",
              "<b>Nuevo usuario</b>.", "Tarjeta de una persona: nombre, correo, rol, estado y último acceso."])
    m.h3("Crear un usuario")
    m.steps(["Pulsa <b>Nuevo usuario</b>.",
             "Escribe nombre, correo institucional, elige el rol (<b>Académico</b> o <b>Secretaria</b>) y una contraseña.",
             "Pulsa <b>Crear usuario</b>."])
    m.fig("sec_user_new", "Formulario de nuevo usuario.", max_h=4.2 * inch, max_w=3.5 * inch)
    m.warn("El campo de contraseña viene con una contraseña temporal <b>precargada que es la misma para todos los usuarios nuevos</b>. "
           "Escribe una <b>distinta para cada persona</b> (8+ caracteres con mayúscula, minúscula, número y símbolo) y "
           "entrégasela por un medio privado: el correo de bienvenida <b>no</b> incluye la contraseña. Pídele que la "
           "cambie en su primer acceso.")
    m.bullets(["<b>Editar</b>: cambia nombre, correo o rol; deja la contraseña vacía para no cambiarla. También sirve para dar una contraseña nueva a quien la olvidó.",
               "<b>Desactivar</b>: la persona ya no puede entrar, pero sus reservaciones se conservan. Se puede <b>reactivar</b> después. No puedes desactivar tu propia cuenta.",
               "Las cuentas de <b>Super Administrador</b> solo las puede modificar otro Super Administrador."])
    m.h3("Contactos externos")
    m.p("En la pestaña <b>Contactos Externos</b> están las personas ajenas a la universidad que pueden figurar como "
        "responsables de una reservación (nombre, correo y organización).")
    m.fig("sec_users_external", "Contactos externos.", max_h=2.6 * inch)

    m.h2("8.2 Festivos y cierres")
    m.fig("sec_calendar_admin", "Pestaña Calendario (Festivos / Cierres).", max_h=4.3 * inch)
    m.legend(["Calendario para elegir la fecha: haz clic en el día.", "<b>Tipo de fecha</b>.", "Nombre o descripción.",
              "<b>Marcar fecha</b>.", "Lista de fechas marcadas (el bote de basura quita una marca)."])
    m.table(["Tipo", "Efecto en el calendario"], [
        ["<b>Día festivo</b>", "Resalta la fecha en amarillo, pero <b>se puede reservar</b>."],
        ["<b>Cierre institucional</b>", "<b>Bloquea el día</b>: no se puede reservar y las series recurrentes lo omiten."],
        ["Evento", "Marca informativa que no bloquea. Se crea con clic derecho sobre un día en la vista mensual."],
    ], [2.0, 5.5])
    m.tip("También puedes marcar un día con <b>clic derecho</b> sobre él en el calendario mensual de «Reservar».")
    m.note("Si al marcar una fecha ya hay reservaciones activas ese día, el sistema te lo advierte; las reservaciones "
           "existentes no se cancelan solas. Las <b>fechas del semestre</b> aparecen en la misma pestaña, pero solo un "
           "Super Administrador puede cambiarlas.")
    m.fig("sec_semester_readonly", "Fechas del semestre (solo lectura para la Secretaria).", max_h=1.8 * inch, max_w=4.6 * inch)

    m.h2("8.3 Notificaciones")
    m.p("Esta pestaña lista los <b>correos que el sistema intentó enviar</b>: a quién, con qué asunto, cuándo y con qué "
        "resultado (enviado, fallido u omitido). «Omitido» significa que el servicio de correo no está configurado. "
        "El panel de diagnóstico del correo es solo para el Super Administrador.")
    m.fig("sec_notif", "Pestaña Notificaciones.", max_h=3.7 * inch)
    m.legend(["Diagnóstico del correo (reservado al Super Administrador).", "Registro de correos enviados."])

    # ── 9
    m.h1("9. Usar el sistema en el celular", newpage=False)
    celular(m, "secretaria")

    # ── 10
    m.h1("10. Preguntas frecuentes", newpage=False)
    m.table(["Si te pasa esto…", "Qué hacer"], [
        ["No puedo hacer clic en un día del calendario", "Es domingo o un cierre institucional. Un día festivo sí se puede reservar."],
        ["El formulario dice «Traslape con …»", "Esa sala ya está ocupada a esa hora. Cambia la hora o elige otra sala."],
        ["No veo una reservación que sé que existe", "Revisa que estés viendo la <b>sala</b> correcta (selector superior) y, en Historial, que no haya filtros activos."],
        ["La sesión se cerró sola", "Es normal tras 30 minutos sin actividad. Vuelve a entrar."],
        ["La persona dice que no le llegó el correo", "Revisa spam y la pestaña Notificaciones: si dice «Omitido», el correo no está configurado; avisa al Super Administrador."],
        ["Me equivoqué y cancelé una reservación", "No se puede deshacer. Crea una nueva con los mismos datos."],
        ["Quiero reservar una sala que no aparece", "Solo el Super Administrador puede dar de alta o reactivar salas."],
        ["Veo una pantalla vieja después de una actualización", "Recarga forzada: Ctrl + Mayús + R (en Mac, Cmd + Mayús + R)."],
        ["No me deja entrar tras varios intentos", "Espera 15 minutos o pide ayuda al Super Administrador."],
    ], [2.9, 4.6])
    m.h2("Atajos útiles")
    m.table(["Acción", "Cómo"], [
        ["Contraer o expandir el menú", "Ctrl + B (Mac: Cmd + B)"],
        ["Seleccionar varios horarios", "Ctrl + clic o Mayús + clic en cada bloque"],
        ["Copiar, cortar o pegar una reservación", "Clic derecho en la vista semanal"],
        ["Marcar un día como festivo o cierre", "Clic derecho sobre el día"],
        ["Cerrar una ventana", "Tecla Esc o botón ×"],
    ], [3.4, 4.1])
    m.p("Si algo no funciona como se describe aquí, anota la hora, lo que hacías y, si puedes, toma una captura de "
        "pantalla, y repórtalo al Super Administrador.", small)
    return m


# ════════════════════════════════════════════════════════════════════════════
#  MANUAL DEL ACADÉMICO
# ════════════════════════════════════════════════════════════════════════════
def academico():
    m = Manual("Manual del Académico", "IberoReservations · Sala de Juntas",
               ["Manual del", "Académico"], "Cómo consultar tus reservaciones de la sala de juntas",
               VERSION + " · " + DEMO)

    m.h1("1. Bienvenido")
    m.p("<b>IberoReservations</b> es el sistema con el que la universidad administra sus salas de juntas. Como "
        "<b>académico</b> tu acceso es de <b>consulta</b>: puedes ver tus reservaciones en un calendario, revisar su "
        "historial y descargarlo. <b>Las reservaciones las registra la secretaría</b>; si necesitas una sala, una "
        "modificación o una cancelación, se las pides a ella (sección 5).")
    m.h2("Qué puedes y qué no puedes hacer")
    m.table(["Puedes", "No puedes"], [
        ["Entrar con tu correo institucional y cambiar tu contraseña", "Crear, editar, mover o cancelar reservaciones"],
        ["Ver en el calendario tus reservaciones (mes o semana)", "Ver las reservaciones de otras personas"],
        ["Ver el detalle de cada reservación", "Entrar a Estadísticas ni a Administración"],
        ["Buscar y filtrar tu historial, y exportarlo a Excel, PDF o CSV", ""],
    ], [3.8, 3.7])
    m.note("El sistema solo te muestra las reservaciones <b>en las que eres el responsable o que se registraron a tu nombre</b>. "
           "Aunque el calendario diga «modo consulta», <b>no</b> sirve para ver si la sala está libre: para eso consulta a la secretaría.")

    m.h1("2. Primeros pasos")
    acceso(m, "academico")
    m.h2("Conoce la pantalla")
    m.fig("common_sidebar_academico", "Menú lateral del Académico.", max_w=2.7 * inch, max_h=2.0 * inch)
    m.legend(["<b>Calendario</b>: tus reservaciones.", "<b>Historial</b>: lista de tus reservaciones con búsqueda y exportación."])
    m.p("En la computadora puedes <b>contraer el menú</b> para ganar espacio con el botón de tres rayitas de la barra "
        "superior o con <b>Ctrl + B</b> (en Mac, <b>Cmd + B</b>). El sistema recuerda tu elección.")

    m.h1("3. Calendario")
    m.fig("acad_calendar", "Calendario en vista mensual.", max_h=4.3 * inch)
    m.legend(["Aviso de <b>modo consulta</b>: no puedes crear ni modificar nada desde aquí.",
              "<b>Selector de sala</b>: el calendario muestra una sala a la vez.",
              "<b>Mes / Semana</b>: cambia la vista.",
              "Flechas para ir al periodo anterior o siguiente (y <b>Hoy</b> para volver a la fecha actual).",
              "El calendario con <b>tus</b> reservaciones."])
    m.h2("Qué significa cada color")
    m.table(["Color", "Significado"], [
        ["Rojo", "Una de tus reservaciones"],
        ["Morado", "Una reservación tuya que forma parte de una serie que se repite"],
        ["Azul verdoso", "El día de hoy"],
        ["Amarillo", "Día festivo (solo informativo)"],
        ["Gris", "Cierre institucional: ese día no se hacen reservaciones"],
    ], [1.6, 5.9])
    m.h2("Ver el detalle de una reservación")
    m.p("Haz clic en cualquiera de tus reservaciones: se abre una ventana con la fecha, el horario, el responsable, el "
        "nombre de la junta, quién la registró y su estado. Ciérrala con la <b>x</b> o con la tecla Esc.")
    m.fig("acad_popup", "Detalle de una reservación (solo lectura).", max_h=3.4 * inch, max_w=5.6 * inch)
    m.h2("Vista semanal")
    m.p("Con el botón <b>Semana</b> ves tus reservaciones por hora, de lunes a domingo.")
    m.fig("acad_week", "Vista semanal.", max_h=3.4 * inch)

    m.h1("4. Historial")
    m.p("El <b>Historial</b> lista todas tus reservaciones, también las canceladas, con la fecha, el horario, la sala, "
        "el responsable, quién la registró y el nombre de la junta.")
    m.fig("acad_hist", "Historial del académico.", max_h=4.3 * inch)
    m.legend(["<b>Buscar</b> por texto; el selector de la derecha limita la búsqueda a un campo.",
              "Pestañas <b>Todas / Activas / Canceladas</b> con su contador.",
              "La tabla. Pulsa el título de una columna para ordenar. En la columna Acciones verás «—»: no puedes modificar desde aquí."])
    m.bullets(["<b>Fechas</b>: atajos como «Hoy», «Esta semana» o «Este mes», o un rango propio con «Desde» y «Hasta».",
               "<b>Sala</b>: muestra solo una sala. <b>Filtros</b>: tipo de responsable.",
               "Cada filtro activo aparece como una etiqueta que puedes quitar con su <b>x</b>; <b>Limpiar</b> quita todos.",
               "Los botones <b>Excel</b>, <b>PDF</b> y <b>CSV</b> de la parte superior exportan lo que estás viendo. PDF y Excel incluyen los filtros aplicados; CSV trae solo los datos."])
    m.note("Los registros se conservan <b>18 meses</b>; después se eliminan automáticamente.")

    m.h1("5. ¿Cómo pido una reservación?")
    m.p("Las reservaciones las hace la secretaría. Para agilizarlo, ten a la mano:")
    m.bullets(["La <b>sala</b> que necesitas (si hay más de una).",
               "La <b>fecha</b> y la <b>hora de inicio y de fin</b>.",
               "El <b>nombre de la junta</b> (por ejemplo, «Consejo académico»).",
               "Si se <b>repite</b> (cada semana, cada quincena…) y hasta cuándo.",
               "Cualquier <b>observación</b> útil: equipo necesario, número de asistentes, etc."])
    m.p("Para <b>cambiar el horario o cancelar</b>, avísale a la secretaría lo antes posible. Cuando ella termine, "
        "podrás ver la reservación en tu Calendario.")
    m.h2("Correos que puedes recibir")
    m.p("Si el servicio de correo de la universidad está activo, recibirás un aviso cuando:")
    m.bullets(["se <b>registre</b> una reservación a tu nombre (confirmación con sala, fecha y horario);",
               "se <b>modifique</b> (por ejemplo, cambio de hora o de sala);",
               "se <b>cancele</b>;", "te creen la cuenta o cambien tu contraseña."])

    m.h1("6. Usar el sistema en el celular")
    celular(m, "academico")

    m.h1("7. Preguntas frecuentes", newpage=False)
    m.table(["Si te pasa esto…", "Qué hacer"], [
        ["No veo una junta mía en el calendario", "Revisa que estés en la <b>sala</b> correcta (selector superior) y en el mes o semana adecuados. Si aun así no aparece, pregunta a la secretaría si ya la registró."],
        ["No veo reservaciones de otras personas", "Es así por privacidad: solo ves las tuyas."],
        ["Quiero cambiar o cancelar una reservación", "Pídeselo a la secretaría; desde tu cuenta no es posible."],
        ["Olvidé mi contraseña", "Pulsa «¿Olvidaste tu contraseña?» en la pantalla de inicio. Si el correo no llega, pide a la secretaría que te asigne una nueva."],
        ["La sesión se cerró sola", "Es normal tras 30 minutos sin actividad. Vuelve a entrar."],
        ["No me deja entrar tras varios intentos", "Espera 15 minutos antes de intentarlo de nuevo."],
        ["Veo una pantalla vieja", "Recarga forzada: Ctrl + Mayús + R (en Mac, Cmd + Mayús + R)."],
    ], [2.6, 4.9])
    return m


# ════════════════════════════════════════════════════════════════════════════
#  MANUAL DEL ADMINISTRADOR (SUPER ADMINISTRADOR)
# ════════════════════════════════════════════════════════════════════════════
def administrador():
    m = Manual("Manual del Administrador", "IberoReservations · Sala de Juntas",
               ["Manual del", "Administrador"], "Usuarios, salas, calendario, correo y respaldos",
               VERSION + " · " + DEMO)

    m.h1("1. El rol de Super Administrador")
    m.p("El <b>Super Administrador</b> es una Secretaria con permisos adicionales sobre la configuración del sistema. "
        "Puede hacer todo lo que hace una Secretaria (reservar, editar, cancelar, historial, estadísticas, usuarios y "
        "festivos; ver el <b>Manual de la Secretaria</b>) y, además:")
    m.table(["Función exclusiva", "Dónde"], [
        ["Dar de alta, editar y desactivar <b>salas</b>", "Administración › Salas"],
        ["Crear, editar y desactivar cuentas de <b>Super Administrador</b>", "Administración › Usuarios"],
        ["Definir las <b>fechas del semestre</b>", "Administración › Calendario"],
        ["Revisar el estado del <b>correo</b> y enviar un correo de prueba", "Administración › Notificaciones"],
        ["Descargar <b>respaldos</b> de la información", "Administración › Respaldos"],
    ], [4.2, 3.3])
    m.warn("Es un rol de mucha responsabilidad. Úsalo con una <b>cuenta personal</b> (no compartida) y procura que haya "
           "<b>al menos dos</b> Super Administradores para no depender de una sola persona.")
    m.h2("Lista de arranque (primera vez)")
    m.steps([
        "<b>Cambia la contraseña de la cuenta inicial.</b> El sistema se entrega con una cuenta de Super Administrador cuya contraseña inicial es conocida; cámbiala de inmediato (sección 2).",
        "Crea tu <b>cuenta personal</b> de Super Administrador y deja de usar la inicial, o cámbiale el nombre y el correo a los tuyos (sección 4).",
        "<b>Salas</b>: renombra «Sala Principal» con el nombre real y da de alta las demás (sección 5).",
        "<b>Semestre</b>: captura las fechas de inicio y fin (sección 6).",
        "<b>Festivos y cierres</b> del ciclo escolar (sección 6).",
        "<b>Usuarios</b>: crea las cuentas de secretarias y académicos (sección 4).",
        "<b>Correo</b>: confirma que el servicio funciona y envía un correo de prueba (sección 7).",
        "Descarga el <b>primer respaldo</b> (sección 8).",
    ])

    m.h1("2. Entrar y proteger tu cuenta")
    acceso(m, "admin")
    m.p("Cuando entras como Super Administrador, la etiqueta de la esquina superior derecha dice <b>Super Admin</b> y el "
        "menú muestra opciones adicionales.")
    m.fig("adm_sidebar", "Menú lateral del Super Administrador.", max_w=2.7 * inch, max_h=3.6 * inch)
    m.legend(["<b>Usuarios</b>.", "<b>Salas</b> (solo Super Administrador).", "<b>Festivos / Cierres</b> y fechas del semestre.",
              "<b>Notificaciones</b>: registro de correos y diagnóstico.", "<b>Respaldos</b> (solo Super Administrador)."])

    m.h1("3. Panorama de la Administración")
    m.p("Las opciones de Administración están en el menú y también como pestañas en la parte superior de la página. "
        "Cada pestaña se explica en las secciones siguientes. Para lo demás (calendario, Historial, Estadísticas), "
        "consulta el <b>Manual de la Secretaria</b>.")
    m.table(["Pestaña", "Para qué sirve", "Quién la ve"], [
        ["Usuarios", "Cuentas de personas y contactos externos", "Secretaria y Super Administrador"],
        ["Salas", "Lista de salas reservables", "Solo Super Administrador"],
        ["Calendario", "Festivos, cierres y fechas del semestre", "Marcar fechas: ambas; fechas del semestre: solo Super Administrador"],
        ["Notificaciones", "Registro de correos y diagnóstico del servicio", "Registro: ambas; diagnóstico: solo Super Administrador"],
        ["Respaldos", "Descarga de la información", "Solo Super Administrador"],
    ], [1.4, 3.6, 3.0])

    m.h1("4. Usuarios")
    m.fig("adm_users", "Pestaña Usuarios (vista del Super Administrador).", max_h=3.8 * inch)
    m.legend(["Pestañas de Administración.", "<b>Nuevo usuario</b>.",
              "Tarjeta de una persona: nombre, correo, rol, estado, último acceso y acciones. Las cuentas con la etiqueta <b>Super Admin</b> las ves marcadas."])
    m.h2("Crear un usuario")
    m.steps(["Pulsa <b>Nuevo usuario</b>.", "Escribe nombre completo y correo institucional.",
             "Elige el <b>rol</b>: <b>Académico</b> (solo consulta) o <b>Secretaria</b>.",
             "Si la persona debe ser <b>Super Administrador</b>, marca la casilla correspondiente (solo tú la ves).",
             "Escribe una contraseña y pulsa <b>Crear usuario</b>."])
    m.fig("adm_user_new", "Formulario de nuevo usuario con la casilla «Super Administrador».", max_h=4.4 * inch, max_w=3.6 * inch)
    m.legend(["Rol de la cuenta.", "<b>Super Administrador</b>: además de las funciones de Secretaria, gestiona respaldos, el semestre y cuentas de Super Administrador. Siempre conserva el rol de Secretaria.",
              "Contraseña inicial."])
    m.warn("El campo de contraseña viene <b>precargado con una contraseña temporal igual para todos los usuarios nuevos</b>. "
           "Escribe una <b>distinta para cada persona</b> y entrégasela por un medio privado: el correo de bienvenida "
           "<b>no</b> incluye la contraseña. Debe tener 8+ caracteres con mayúscula, minúscula, número y símbolo.")
    m.h2("Editar, cambiar contraseña, desactivar y reactivar")
    m.bullets([
        "<b>Editar</b> permite cambiar nombre, correo, rol y (solo tú) la casilla de Super Administrador. Para dar una contraseña nueva a quien olvidó la suya, escríbela en el campo; si lo dejas vacío no cambia. No puedes quitarte a ti mismo el rol de Super Administrador.",
        "<b>Desactivar</b>: la persona ya no puede iniciar sesión, pero sus reservaciones e historial se conservan. Recibe un aviso por correo. No puedes desactivar tu propia cuenta.",
        "<b>Activar</b> (aparece en las cuentas desactivadas) devuelve el acceso.",
        "No existe la opción de «borrar» una cuenta: desactivar es la forma de dar de baja y conserva el historial.",
    ])
    m.fig("adm_user_deactivate", "Confirmación al desactivar una cuenta.", max_h=2.0 * inch, max_w=4.4 * inch)
    m.tip("Cuando alguien deje la universidad, <b>desactiva</b> su cuenta el mismo día. Revisa periódicamente la lista de usuarios activos.")
    m.p("La pestaña <b>Contactos Externos</b> guarda a las personas ajenas a la universidad que pueden figurar como responsables "
        "de una reservación (nombre, correo y organización); se pueden agregar y editar.")

    m.h1("5. Salas")
    m.p("Cada reservación pertenece a <b>una sala</b>, y los traslapes se revisan <b>dentro de la misma sala</b>. Solo el Super "
        "Administrador administra la lista de salas.")
    m.fig("adm_rooms", "Pestaña Salas.", max_h=2.6 * inch)
    m.legend(["<b>Nueva sala</b>.", "Tarjeta de una sala: nombre, ubicación, capacidad y estado, con los botones <b>Editar</b> y <b>Desactivar</b>."])
    m.h2("Dar de alta una sala")
    m.steps(["Pulsa <b>Nueva sala</b>.", "Escribe el <b>nombre</b> (obligatorio). La <b>ubicación</b> y la <b>capacidad</b> (un número entero positivo) son opcionales.",
             "Pulsa <b>Crear sala</b>."])
    m.fig("adm_room_new", "Formulario de nueva sala.", max_h=3.4 * inch, max_w=3.4 * inch)
    m.legend(["Nombre de la sala (por ejemplo, «Sala Ejecutiva»).", "Ubicación (por ejemplo, «Edificio P, 2.º piso»).", "Capacidad en personas."])
    m.h2("Editar o desactivar")
    m.bullets(["<b>Editar</b> cambia nombre, ubicación o capacidad. El cambio de nombre se refleja también en el historial.",
               "<b>Desactivar</b> oculta la sala en los selectores y en el formulario de reservación: no se podrán crear reservaciones nuevas en ella, pero <b>sus reservaciones existentes y su historial se conservan</b>. <b>Activar</b> la vuelve a mostrar.",
               "No hay opción de borrar salas."])
    m.note("El sistema se entrega con una sala llamada <b>«Sala Principal»</b>. Es un nombre provisional: edítala con el nombre real de tu sala.")

    m.h1("6. Festivos, cierres y semestre")
    m.fig("adm_calendar", "Pestaña Calendario.", max_h=4.2 * inch)
    m.legend(["Calendario para elegir la fecha (clic en el día).", "<b>Tipo de fecha</b>.", "<b>Marcar fecha</b> (después de escribir el nombre).",
              "Lista de fechas marcadas, con el bote de basura para quitar una."])
    m.table(["Tipo", "Efecto en el calendario"], [
        ["<b>Día festivo</b>", "Resalta la fecha en amarillo; <b>se puede reservar</b>."],
        ["<b>Cierre institucional</b>", "<b>Bloquea el día</b>: no se puede reservar y las series recurrentes lo omiten."],
        ["Evento", "Marca informativa que no bloquea (se crea con clic derecho sobre un día del calendario mensual de «Reservar»)."],
    ], [2.0, 5.5])
    m.warn("Un <b>cierre</b> solo impide reservar <b>desde la pantalla</b>; si ya había reservaciones en esa fecha, no se cancelan solas. "
           "Al marcarlo, el sistema te advierte cuántas reservaciones activas hay ese día para que las revises.")
    m.h2("Fechas del semestre")
    m.p("Más abajo en la misma pestaña está el cuadro <b>Semestre actual</b>. Captura <b>Inicio</b> y <b>Fin del semestre</b> y "
        "pulsa <b>Guardar</b>. Estas fechas las usa la opción «Al final del semestre actual» al crear reservaciones recurrentes: "
        "si no están configuradas, esa opción no se puede usar. Actualízalas una vez por periodo.")
    m.fig("adm_semester", "Fechas del semestre (editables para el Super Administrador).", max_h=2.7 * inch, max_w=4.6 * inch)

    m.h1("7. Correo y notificaciones")
    m.p("El sistema envía correos automáticos para que las personas estén enteradas:")
    m.table(["Evento", "Quién recibe el correo"], [
        ["Reservación creada, modificada o cancelada (incluye la sala)", "El responsable de la junta; si otra persona editó o canceló, también la secretaria que la creó"],
        ["Cuenta creada, desactivada o reactivada", "La persona afectada"],
        ["Contraseña cambiada o restablecida", "La persona afectada"],
        ["Enlace para restablecer contraseña (válido 60 minutos)", "Quien lo solicita"],
    ], [4.2, 3.8])
    m.fig("adm_notif", "Pestaña Notificaciones: diagnóstico del correo y registro.", max_h=3.8 * inch)
    m.legend(["<b>Diagnóstico del correo</b> (solo Super Administrador).", "<b>Registro</b> de los correos que el sistema intentó enviar, con su resultado."])
    m.table(["Indicador", "Qué significa", "Qué hacer"], [
        ["Verde: «Servicio de correo en funcionamiento»", "Se pudo conectar y autenticar con el servidor de correo", "Nada. Puedes enviar un correo de prueba."],
        ["Amarillo: «Credenciales o conexión inválida»", "Hay configuración, pero la verificación falló (contraseña vencida, servidor inalcanzable…)", "Avisa al equipo técnico; el botón «Enviar correo de prueba» indica la causa del fallo."],
        ["Rojo: «Servicio de correo no configurado»", "Faltan datos de correo en el servidor", "El sistema sigue funcionando, pero nadie recibe correos. Pide al equipo técnico configurarlo."],
    ], [2.5, 3.0, 2.5])
    m.p("En el registro, cada correo aparece como <b>enviado</b>, <b>fallido</b> u <b>omitido</b> (cuando el correo no está configurado). "
        "Cuando el correo está configurado (indicador verde o amarillo), el botón <b>Enviar correo de prueba</b> pide un destinatario, envía un mensaje de verificación "
        "y, si falla, explica el motivo en español (credenciales, tiempo de espera, conexión rechazada, servidor no encontrado, remitente rechazado o error de cifrado).")
    m.note("Los datos de conexión del correo (servidor, usuario y contraseña) se configuran <b>en el servidor</b>, no desde esta pantalla, "
           "y cambiarlos requiere reiniciar el servicio. Eso corresponde al equipo técnico; la guía está en <b>docs/SMTP_ADMIN_GUIDE.md</b>.")

    m.h1("8. Respaldos")
    m.fig("adm_backup", "Pestaña Respaldos.", max_h=3.2 * inch)
    m.legend(["<b>Descargar respaldo SQL (.sql)</b>: genera y descarga un archivo con la información.",
              "Resumen de lo que contiene: reservaciones, usuarios y fechas festivas o cierres (además del historial de cambios)."])
    m.steps(["Pulsa <b>Descargar respaldo SQL</b>. El navegador guarda un archivo con extensión <b>.sql</b>.",
             "Guárdalo en un lugar seguro y con acceso restringido (no en una carpeta compartida abierta ni por correo).",
             "Anota la fecha y quién lo descargó."])
    m.warn("El respaldo contiene <b>datos personales</b> (nombres, correos) y las contraseñas cifradas de los usuarios. Trátalo como información confidencial.")
    m.bullets(["El sistema <b>no restaura</b> respaldos desde esta pantalla. Si hace falta recuperar información, lo hace el equipo técnico con el procedimiento del <b>RUNBOOK</b> (sección «Restore a backup»).",
               "La lista «Historial de respaldos» de la parte inferior solo recuerda los respaldos descargados <b>desde ese navegador</b>; no es un inventario de archivos.",
               "Recomendación: descarga un respaldo <b>antes de cualquier actualización del sistema</b> y de forma periódica (por ejemplo, cada semana)."])

    m.h1("9. Políticas y datos")
    m.table(["Tema", "Cómo funciona"], [
        ["Retención de datos", "Todos los registros se conservan <b>18 meses</b>. Cada día el sistema elimina automáticamente reservaciones cuya fecha de fin tiene más de 18 meses, junto con el historial de cambios, el registro de correos y las fechas marcadas de esa antigüedad. Esto también afecta al Historial y a Estadísticas."],
        ["Sesión", "Se cierra tras 30 minutos sin actividad."],
        ["Intentos de acceso", "Tras 5 intentos fallidos, se bloquean nuevos intentos durante 15 minutos."],
        ["Contraseñas", "Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo. Se guardan cifradas; nadie (ni el administrador) puede verlas."],
        ["Trazabilidad", "Cada reservación guarda quién la creó, quién la modificó y qué cambió («Ver cambios» en el Historial)."],
        ["Salas", "Los traslapes se revisan por sala. Una sala desactivada conserva su historial."],
    ], [1.8, 5.7])
    m.h2("Rutinas recomendadas")
    m.table(["Cuándo", "Qué hacer"], [
        ["Al iniciar cada semestre", "Actualizar las fechas del semestre; marcar festivos y cierres del calendario escolar; revisar usuarios activos."],
        ["Cada semana", "Descargar un respaldo; revisar en Notificaciones que no haya correos fallidos."],
        ["Cuando alguien entra o sale", "Crear o desactivar su cuenta ese mismo día."],
        ["Antes de una actualización del sistema", "Descargar un respaldo y avisar al equipo técnico."],
        ["Cuando se abre o cierra una sala", "Dar de alta o desactivar la sala; avisar a las secretarias."],
    ], [2.4, 5.1])

    m.h1("10. Problemas frecuentes y apoyo técnico")
    m.table(["Si pasa esto…", "Qué hacer"], [
        ["Una secretaria no puede entrar", "Revisa en Usuarios que su cuenta esté <b>Activa</b>. Si olvidó la contraseña, edítala y escribe una nueva. Si falló muchas veces, debe esperar 15 minutos."],
        ["Nadie recibe correos", "Notificaciones: si el indicador está en rojo o amarillo, avisa al equipo técnico (guía SMTP)."],
        ["Una sala no aparece al reservar", "Mira en Salas si está <b>Inactiva</b> y actívala."],
        ["«Al final del semestre» no se puede elegir en una serie", "Falta capturar las fechas del semestre (sección 6)."],
        ["Se reservó por error en un día de cierre", "Los cierres bloquean la pantalla, no las reservaciones ya existentes; cancela la reservación desde el Historial."],
        ["Hay que recuperar información borrada", "Solo el equipo técnico puede restaurar un respaldo; indícales la fecha del respaldo a usar."],
        ["La página se ve vieja tras una actualización", "Recarga forzada: Ctrl + Mayús + R (en Mac, Cmd + Mayús + R)."],
    ], [2.8, 4.7])
    m.h2("Documentación técnica (para el equipo de sistemas)")
    m.p("Este manual cubre el uso diario. Para instalación, servidores y operación existen estas guías en el repositorio del proyecto:")
    m.table(["Documento", "Contenido"], [
        ["README.md", "Ejecución local, variables de entorno, base de datos"],
        ["docs/DEPLOYMENT.md y docs/RUNBOOK.md", "Producción, operación, respaldos y restauración, reversa"],
        ["docs/SMTP_ADMIN_GUIDE.md", "Configuración y diagnóstico del correo"],
        ["docs/EMAIL_SYSTEM.md", "Qué correos envía el sistema y cuándo"],
        ["docs/ACCESS.md", "Registro de cuentas y responsables de la infraestructura"],
    ], [3.2, 4.3])
    return m


if __name__ == "__main__":
    builders = {"secretaria": (secretaria, "Manual_Secretaria.pdf"),
                "academico": (academico, "Manual_Academico.pdf"),
                "administrador": (administrador, "Manual_Administrador.pdf")}
    which = sys.argv[1:] or list(builders)
    for k in which:
        fn, out = builders[k]
        fn().build(os.path.join(OUT, out))
        print("generado", out)
