# Manuales de usuario

Guías **en español** para cada tipo de usuario de IberoReservations: los tres primeros manuales llevan
capturas de pantalla y están pensados para personas sin conocimientos técnicos; el cuarto es técnico
(servidor e infraestructura).

| Manual | Para quién | Páginas |
| ------ | ---------- | ------- |
| [Manual de la Secretaria](Manual_Secretaria.pdf) | Quien crea y administra las reservaciones (incluye una guía de arranque para quien entra por primera vez) | 34 |
| [Manual del Académico](Manual_Academico.pdf) | Quien consulta sus reservaciones y la disponibilidad de las salas | 16 |
| [Manual del Administrador](Manual_Administrador.pdf) | Super Administrador: usuarios, salas, calendario, correo y respaldos | 21 |
| [Manual del Administrador del Servidor](Manual_Administrador_Servidor.pdf) | Quien opera el servidor `reservadeii`: arquitectura con diagramas, Dokploy, Traefik, túnel, Cloudflare, respaldos, seguridad y recuperación (verificado en vivo el 6-oct-2026), incluida la vigilancia automática del túnel y los respaldos | 25 |

Las capturas usan **datos ficticios** de una pila de demostración (personas
inventadas, dos salas y reservaciones de octubre de 2026); no contienen datos reales.

## Qué dice cada uno (resumen)

- **Secretaria**: entrar y cambiar contraseña, calendario «Reservar», crear
  reservaciones (varios horarios, responsable externo, recurrentes), consultar,
  editar, mover y cancelar, Historial (filtros, acciones, exportación), Estadísticas,
  Usuarios, Festivos y cierres, Notificaciones, uso en celular y preguntas frecuentes.
- **Académico**: qué puede y qué no puede hacer, calendario y detalle de sus
  reservaciones y la disponibilidad (franjas «Ocupado»), Historial, cómo pedir una reservación a la secretaría y qué correos recibirá.
- **Administrador**: lista de arranque, usuarios y Super Administradores, salas,
  festivos/cierres/semestre, correo (diagnóstico y registro), respaldos, políticas
  de datos y rutinas recomendadas.

## Mantenimiento

El contenido vive en [`tools/build_manuals.py`](tools/build_manuals.py) y las
imágenes en [`img/`](img). Cuando cambie la interfaz, regenera capturas y PDF con
los pasos de [`tools/README.md`](tools/README.md). **No edites los PDF a mano.**

Los números en círculos rojos de cada captura se explican en la lista que la
acompaña en el texto; si cambias una captura, revisa esa lista.

> Estos manuales describen la versión con **varias salas**, el **recorrido de bienvenida** por rol (botón **?**), el **correo único por serie** y el **correo de invitación** para cuentas cargadas por migración, el selector de sala en
> la barra superior, el menú lateral contraíble y el nuevo Historial (octubre de 2026).
