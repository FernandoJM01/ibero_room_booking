# Día festivo: solo resalta, se puede reservar (2026-09-28)

Antes, "Día festivo" y "Cierre institucional" hacían lo mismo: bloqueaban el día.
Ahora:

| Tipo | Se ve en el calendario | Se puede reservar |
|---|---|---|
| Día festivo | Resaltado (amarillo + nombre) | **Sí** |
| Evento | Resaltado | Sí |
| Cierre institucional | Resaltado (gris) | **No** |

Cambios (solo frontend; el backend nunca validó festivos/cierres):
- `calendar-grid.js`: la celda del mes es clicable salvo cierre / domingo.
- `calendar-week.js`: solo los cierres deshabilitan la columna/horarios y el
  arrastre de reservaciones; el festivo ya no.
- `recurring.js`: series recurrentes solo saltan cierres (motivo `closure`).
- `dashboard.js`: aviso al mover una serie habla de cierre, no de festivo.
- `calendar.css`: la celda festiva ya no muestra cursor "no permitido".
- Textos: opciones en Festivos / Cierres, popover y tutorial aclaran la diferencia.

Los festivos ya guardados no requieren migración: cambia su comportamiento
automáticamente. Si alguno debe seguir bloqueado, se re-marca como cierre.
