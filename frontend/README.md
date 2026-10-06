# Frontend de IberoReservations

Interfaz web de la plataforma de reservación de salas de juntas de la
Universidad Iberoamericana (CDMX).

Es **HTML5 + CSS3 + JavaScript sin framework y sin paso de compilación**. Nginx
sirve los archivos tal cual y reenvía `/api/` al backend. Todos los datos viven en
PostgreSQL y se consultan por la API REST; el navegador solo guarda la sesión y
algunas preferencias (ver más abajo).

> Cómo levantar todo el sistema (base de datos, API y este frontend) está en el
> [README principal](../README.md). Esta carpeta se monta en Nginx durante el
> desarrollo, así que los cambios se ven al recargar la página.
>
> ¿Buscas instrucciones de uso? Consulta los [manuales de usuario](../docs/manual/README.md).

## Páginas y roles

| Archivo | Para qué sirve | Quién entra |
| ------- | -------------- | ----------- |
| `index.html` | Inicio de sesión y recuperación de contraseña | Todos |
| `reset-password.html` | Define una contraseña nueva desde el enlace del correo | Todos |
| `dashboard.html` | **Reservar**: calendario mensual/semanal, estadísticas rápidas y próximas reservaciones | Secretaría |
| `calendar.html` | **Calendario** de consulta (solo lectura): sus reservaciones completas y las de otras personas como franjas «Ocupado» | Académico |
| `historial.html` | Historial con filtros, edición, cancelación y exportación | Secretaría y académico (el académico solo ve lo suyo y sin acciones; otras personas nunca aparecen aquí) |
| `estadisticas.html` | Indicadores y gráficas por periodo y sala | Secretaría |
| `admin.html` | Administración por pestañas: Usuarios, Salas, Calendario (festivos/cierres y semestre), Notificaciones, Respaldos | Secretaría; **Salas** y **Respaldos** solo Super Administrador |
| `ai-panel.html` | Asistente IA para proponer reservaciones. **Oculto**: no aparece en el menú y está desactivado en el formulario | Secretaría (solo por URL) |

El menú lateral se arma en `js/components/sidebar.js` según el rol. Los permisos
reales se validan en el backend; la interfaz solo oculta lo que no corresponde.

## Estructura

```text
frontend/
├── *.html                  # Páginas (una por pantalla)
├── css/
│   ├── variables.css       # Colores, espacios, tipografía (rojo Ibero #ef3e42)
│   ├── base.css, layout.css, responsive.css
│   ├── components/         # Calendario, formularios, modales, tablas…
│   └── pages/              # Estilos por página (dashboard, history, stats…)
├── js/
│   ├── core/               # api.js (cliente REST), store.js (estado), utils.js, router.js
│   ├── modules/            # Lógica de negocio: reservations, calendar, recurring, export, search…
│   ├── components/         # Piezas reutilizables: sidebar, modales, calendario, toasts…
│   └── pages/              # Un archivo por pantalla (arranca la página)
├── nginx/                  # Plantilla de Nginx (BACKEND_URL se inyecta al iniciar)
├── assets/                 # Logotipos e íconos
└── data/mock-data.js       # Heredado de la etapa de prototipo; ya no se usa
```

Las librerías de gráficas y exportación se cargan desde CDN (cdnjs): Chart.js
4.4.1, jsPDF 2.5.1 con jspdf-autotable 3.8.2 y SheetJS 0.18.5. Sin acceso a
internet, esas pantallas siguen abriendo pero no podrán graficar ni exportar.

## Navegación sin recarga (SPA)

`sidebar.js` intercepta los clics del menú, descarga la página destino y
reemplaza solo `.page-content` y la barra superior. Cada página se inicia con su
función `init()` en `DOMContentLoaded` **y** en el evento `SPA:Navigated`, por lo
que cualquier script nuevo debe tolerar ejecutarse varias veces.

## Datos guardados en el navegador (`localStorage`)

| Clave | Contenido |
| ----- | --------- |
| `ibero_jwt`, `ibero_session`, `ibero_login_time` | Sesión. Se cierra tras **30 minutos de inactividad**; el token del servidor dura 8 h (`JWT_EXPIRES_IN`) |
| `ibero_selected_room` | Última sala elegida en el calendario |
| `ibero_sidebar_collapsed` | Menú lateral contraído (`1`) o expandido |
| `sjibero_tutorial_v1` | El tutorial de bienvenida ya se mostró |

## Versión de los archivos (`?v=N`) — importante

Nginx indica a los navegadores que guarden `.js` y `.css` **un año**
(`immutable`). Para que un cambio llegue a quien ya visitó el sitio, todas las
etiquetas `<script>` y `<link>` de **todos** los HTML llevan un número de versión
(`archivo.js?v=45`, por ejemplo) y **hay que subirlo en cada cambio de JS o CSS**:

```bash
grep -o "v=[0-9]*" frontend/index.html | head -1                 # versión actual
sed -i '' 's/v=45/v=46/g' frontend/*.html                        # macOS (en Linux: sed -i sin '')
```

Si olvidas hacerlo, los usuarios seguirán ejecutando la versión anterior aunque
recarguen con Cmd/Ctrl + Mayús + R (ver `docs/DEPLOYMENT.md`, observación 12).

## Responsive y accesibilidad

- Puntos de corte principales: 640 px y 768 px (menú lateral como cajón), con
  ajustes adicionales a 480 px y 360 px.
- En escritorio el menú lateral se puede contraer (botón ☰, asa en el borde o
  `Ctrl/⌘ + B`); la preferencia se recuerda. Se respeta `prefers-reduced-motion`.
- Etiquetas ARIA en formularios, diálogos y controles del calendario.
