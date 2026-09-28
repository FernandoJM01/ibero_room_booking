# Sidebar contraíble + rediseño de Historial (2026-09-28)

## Sidebar
- Dos estados en escritorio: expandido (260px) y riel compacto de iconos (72px).
  `html.sidebar-collapsed` cambia `--sidebar-width`, que mueve a la vez el ancho
  del menú y el margen del contenido (animación sincronizada, ~300ms).
- Botones: ☰ de la barra superior, asa al borde del menú (aparece al pasar el
  mouse) y `Ctrl/⌘ + B`. En móvil sigue el cajón (drawer).
- Compacto: tooltips en `<body>` (no se recortan), menú de usuario como panel
  lateral, insignia de solicitudes como punto.
- Se recuerda en `localStorage['ibero_sidebar_collapsed']`; un script en `<head>`
  de las 6 páginas con menú lo aplica antes del primer pintado. Sin animación en
  la carga inicial ni con `prefers-reduced-motion`.

## Historial
- Un solo scroll: la tabla ocupa el alto disponible (cabecera fija). La política
  de retención pasó a un ⓘ en el pie de la tabla (texto completo al hacer clic).
- Filtros: búsqueda con selector de campo integrado, rango de fechas con atajos
  (Hoy, Esta semana, Este mes, Este año, Últimos/Próximos 30 días), Sala, y
  "Filtros" (Tipo). Estado pasó a pestañas con contador. Chips quitables +
  "Limpiar". En móvil los paneles son hojas inferiores.
- Filas: fecha y horario en una sola celda; nombres largos con elipsis + tooltip.
- Exportaciones sin cambios de formato: el encabezado de filtros y el nombre del
  archivo salen del mismo estado (verificado con Excel).
- Estilos nuevos en `css/pages/history.css`; `tables.css` conserva las clases
  `.filter-*` que aún usa Estadísticas.
