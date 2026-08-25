# Sala de Juntas Ibero — Plataforma de Reservación de Sala

Plataforma web completa de gestión y reservación de sala de juntas para la Universidad Iberoamericana CDMX, desarrollada con HTML5 + CSS3 + JavaScript Vanilla en el frontend y Node.js/Express + PostgreSQL en el backend.

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker Desktop instalado y ejecutándose
- Git para clonar el repositorio

### Instalación y Ejecución

```bash
# Clonar el repositorio
git clone <repo-url>
cd sala-juntas-ibero-docker

# Crear archivo .env con variables de entorno
cp .env.example .env

# Iniciar los contenedores
docker compose up -d --build

# Acceder a la aplicación
# Frontend: http://localhost:8080
# Backend API: http://localhost:8080/api (proxied by Nginx)
```

### Credenciales de Prueba

**Usuario Secretaria:**
- Email: `secretaria@ibero.mx`
- Contraseña: `Admin123!`

**Usuario Académico:**
- Email: `academico@ibero.mx`
- Contraseña: `Acad456!`

**Usuario Super Administrador:**
- Email: `julieta.esquinca@ibero.mx` o `ferjm789@gmail.com`
- Contraseña: `Admin123!`

## 📋 Características Implementadas

### Autenticación (HU-01, 02, 03)
- ✅ Login diferenciado por roles (Secretaria/Académico)
- ✅ JWT-based authentication con timeout de 30 minutos
- ✅ Logout seguro
- ✅ Protección de rutas por rol

### Calendario (HU-04, 05, 06, 07)
- ✅ Vista mensual y semanal
- ✅ Navegación sin restricciones
- ✅ Reservaciones visuales por color
- ✅ Días festivos y cierres institucionales
- ✅ Popup de detalle al click

### Reservaciones (HU-08 al 17, 27)
- ✅ Crear nuevas reservaciones
- ✅ Editar reservaciones existentes
- ✅ Cancelar reservaciones
- ✅ Eliminación masiva con checkbox
- ✅ **Detección de traslape en tiempo real (HU-09)**
- ✅ Autocompletado de responsables (HU-15)
- ✅ Campo de observaciones (HU-16)
- ✅ Prellenado automático desde URL (HU-17)
- ✅ **Reservaciones recurrentes (HU-27)** - semanal, quincenal, mensual

### Gestión (HU-18 al 30)
- ✅ Historial de reservaciones con filtros y vistas de usuario
- ✅ Búsqueda y filtrado avanzado
- ✅ Dashboard de estadísticas y analíticas
- ✅ Exportación a PDF/Excel
- ✅ Configuración de días festivos y cierres
- ✅ **Gestión de Contactos Externos**: Administración unificada para asignar salas a usuarios ajenos a la Ibero.

### Administración (Super Admin)
- ✅ Gestión de Usuarios centralizada (CRUD completo)
- ✅ Consola de configuración y backups.
- ✅ **Solicitudes de Cambio**: Flujo donde las secretarias pueden solicitar modificaciones a reservaciones de otras áreas, gestionado mediante una interfaz dedicada en el Historial.

### Interfaz y Experiencia de Usuario (UX)
- ✅ **Componentes Modales Modernos**: Eliminación de alertas nativas a favor de un sistema de modales unificado y estilizado.
- ✅ Sincronización dinámica de navegación en menú lateral sin recargar página.
- ✅ Tablas responsivas con encabezados anclados (*sticky headers*).

## 🏗️ Arquitectura

### Stack Tecnológico

```
Frontend (Nginx)
├── HTML5 + CSS3 + JavaScript Vanilla
├── localStorage para sesión
└── Responsive Mobile-First (320px, 768px, 1200px)

Backend (Express.js)
├── Node.js 20 LTS
├── Authentication: JWT + bcryptjs
├── Database: PostgreSQL 16
└── API RESTful con validaciones

Database (PostgreSQL)
├── Usuarios
├── Reservaciones
├── Recurrencias
├── Eventos de Calendario
├── Logs de Auditoría
└── Backups
```

### Estructura de Carpetas

```
sala-juntas-ibero-docker/
├── frontend/                 # Aplicación web (Nginx)
│   ├── index.html           # Login
│   ├── dashboard.html       # Panel principal
│   ├── calendar.html        # Vista calendario
│   ├── reservacion.html     # Formulario reservación
│   ├── admin.html           # Panel administrativo
│   ├── historial.html       # Historial y búsqueda
│   ├── estadisticas.html    # Dashboard stats
│   ├── ai-panel.html        # Panel IA (futuro)
│   ├── css/                 # Estilos organizados por componentes
│   ├── js/
│   │   ├── core/            # Store, API, Router, Utils
│   │   ├── modules/         # Lógica por feature
│   │   ├── components/      # Componentes reutilizables
│   │   └── pages/           # Lógica específica por página
│   ├── assets/              # Imágenes, iconos, fuentes
│   └── data/                # Datos mock iniciales
│
├── backend/                  # Servidor Express
│   ├── server.js            # Punto de entrada
│   ├── Dockerfile           # Imagen Docker
│   ├── package.json
│   ├── db/
│   │   ├── pool.js          # Conexión a PostgreSQL
│   │   ├── schema.sql       # DDL de tablas
│   │   └── seed.sql         # Datos iniciales
│   ├── middleware/
│   │   ├── auth.js          # Validación JWT
│   │   └── requireRole.js   # Gate de roles
│   ├── routes/
│   │   ├── auth.js          # POST /login, /logout
│   │   ├── reservations.js  # CRUD reservaciones
│   │   ├── calendar.js      # GET/POST holidays
│   │   ├── users.js         # CRUD usuarios
│   │   └── stats.js         # Dashboard aggregates
│   └── utils/
│       └── jwt.js           # Helpers JWT
│
├── docker-compose.yml       # Orquestación 3 servicios
├── .env.example             # Template variables entorno
└── README.md                # Este archivo
```

## 🔌 API Endpoints

### Autenticación
```
POST   /api/auth/login              # { email, password } → { token, user }
POST   /api/auth/logout             # Clear session
POST   /api/auth/forgot-password    # Password recovery
```

### Reservaciones
```
GET    /api/reservations            # Listar todas
POST   /api/reservations            # Crear nueva
PUT    /api/reservations/:id        # Editar
DELETE /api/reservations/:id        # Cancelar
DELETE /api/reservations/bulk       # Eliminación masiva
```

### Calendario
```
GET    /api/calendar/holidays       # Festivos y cierres
POST   /api/calendar/holidays       # Crear festivo
DELETE /api/calendar/holidays/:id   # Eliminar festivo
```

### Usuarios
```
GET    /api/users                   # Listar
POST   /api/users                   # Crear
PUT    /api/users/:id               # Editar
PATCH  /api/users/:id/deactivate    # Desactivar
```

### Estadísticas
```
GET    /api/stats/dashboard         # Métricas del mes
GET    /api/stats/report            # Reporte detallado
```

## ⚙️ Variables de Entorno

Crear archivo `.env` con:

```env
# Base de Datos
DB_NAME=sala_juntas_ibero
DB_USER=postgres
DB_PASSWORD=SecurePassword123!
DB_HOST=db
DB_PORT=5432

# Backend
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this

# Frontend
FRONTEND_URL=http://localhost:8080
```

## 🧪 Pruebas API

### Obtener Token JWT
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"secretaria@ibero.mx","password":"Admin123!"}'
```

### Listar Reservaciones
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/reservations
```

### Crear Reservación
```bash
curl -X POST http://localhost:8080/api/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "responsible_name": "Dr. Ramírez",
    "area": "Academia",
    "start_time": "2026-04-23T10:00:00Z",
    "end_time": "2026-04-23T12:00:00Z",
    "observations": "Reunión semestral"
  }'
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcryptjs
- ✅ JWT con expiración de 8 horas
- ✅ Timeout de sesión a 30 minutos de inactividad
- ✅ Validación de roles en cada endpoint
- ✅ Sanitización de inputs
- ✅ HTTPS en producción (configurar Nginx)
- ✅ Soft deletes (nunca borrar datos activos manualmente)
- ✅ Logs de auditoría para cambios críticos
- ✅ **Política de Retención Automática:** Job de limpieza automática de datos de más de 18 meses (`DATA_RETENTION_MONTHS`) para proteger la privacidad del usuario (reservaciones, logs de auditoría, solicitudes).

## 📊 Base de Datos

### Tablas Principales

**users**
- Usuarios del sistema con roles diferenciados (academico, secretaria) y bandera `is_admin` para Super Admins.
- Hashed passwords con bcryptjs

**external_contacts**
- Directorio de usuarios externos a la universidad que asumen responsabilidad de salas.

**reservations**
- Todas las reservaciones con estado (active/cancelled/past)
- Soporte para responsables internos (`responsible_id`) y externos (`external_responsible_id`).
- Tracking de quién creó y modificó, y soft deletes mediante status.

**modification_requests**
- Rastreo de solicitudes de cambio de horario realizadas por secretarias a reservaciones de terceros, con soporte de estados (pending, approved, rejected).

**recurring_groups**
- Agrupar instancias de reservaciones recurrentes
- Patrón: weekly, biweekly, monthly

**calendar_events**
- Días festivos y cierres institucionales
- Impiden crear nuevas reservaciones

**audit_log**
- Log de todas las acciones críticas
- Trazabilidad completa

## 🚀 Deployment

### Producción en Railway, Vercel o similar

```bash
# 1. Cambiar variables en .env a valores seguros
# 2. Configurar HTTPS en Nginx
# 3. Aumentar JWT_SECRET a valor random largo
# 4. Configurar backups automáticos de DB

docker compose --file docker-compose.yml up -d
```

## 📝 Características Planificadas (Fase 10+)

- [ ] Módulo IA con lenguaje natural (HU-31-33)
- [ ] Notificaciones por email automáticas (HU-23-25)
- [ ] Backup a cloud storage con restore automático (HU-18, 19)
- [ ] Recordatorios 24h antes de reservación
- [ ] Integración con calendarios externos (Google Calendar, Outlook)
- [ ] Sistema de permisos más granular
- [ ] Dark mode
- [ ] Multi-idioma (ES/EN)

## 🐛 Troubleshooting

### Los contenedores no inician
```bash
# Verificar logs
docker compose logs backend
docker compose logs db

# Reiniciar con rebuild
docker compose down -v
docker compose up --build -d
```

### Error: "Port 8080 already in use"
```bash
# Cambiar puerto en docker-compose.yml o:
docker container stop $(docker container ls -q)
```

### Base de datos vacía después de reiniciar
```bash
# Asegurar que los volúmenes están correctos:
docker volume ls | grep sala-juntas
```

## 📚 Documentación Adicional

- **CLAUDE.md** — Especificación completa de historias de usuario y arquitectura
- **API Documentation** — OpenAPI spec disponible en `/api/docs` (futuro)
- **Frontend Architecture** — Patrones y convenciones en `frontend/js/`

## 👥 Autores

- **Liderado por:** Wendy Elizabeth Guzmán Orta
- **Patrocinador:** Julieta Esquinca Gómez
- **Universidad:** Iberoamericana CDMX
- **Proyecto:** Ingeniería de Software 2026

## 📄 Licencia

Código propietario de la Universidad Iberoamericana CDMX.

---

**Última actualización:** Agosto 2026  
**Versión:** 1.2.0  
**Estado:** Production Ready ✅
