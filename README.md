# IberoReservations

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-alpine-009639?logo=nginx&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-All%20rights%20reserved-lightgrey)

Room-booking web application for the meeting rooms of Universidad Iberoamericana
(CDMX). Secretaries and administrators manage reservations on a calendar, with
real-time overlap detection per room, recurring bookings, email notifications,
statistics and PDF/Excel export. Super administrators manage the list of rooms.
Academics get a read-only calendar that shows when each room is busy (other
people's bookings appear only as anonymous "Ocupado" blocks), and a history limited to
the reservations they own or are responsible for.

> **User manuals (Spanish):** step-by-step guides with screenshots for the
> [secretary](docs/manual/Manual_Secretaria.pdf),
> [academic](docs/manual/Manual_Academico.pdf) and
> [administrator](docs/manual/Manual_Administrador.pdf). See
> [`docs/manual/`](docs/manual/README.md).

> This document covers **local development** only. Production deployment is
> documented in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and
> [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Table of contents

- [Tech stack](#tech-stack)
- [Architecture at a glance](#architecture-at-a-glance)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Development workflow](#development-workflow)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)
- [Academic context and license](#academic-context-and-license)

## Tech stack

| Layer    | Technology                                                            |
| -------- | --------------------------------------------------------------------- |
| Frontend | HTML5, CSS3, vanilla JavaScript (no build step), served by Nginx      |
| Backend  | Node.js 20, Express 4, JWT + bcryptjs, helmet, express-rate-limit     |
| Email    | Nodemailer (SMTP, optional)                                           |
| Database | PostgreSQL 16                                                         |
| Runtime  | Docker and Docker Compose                                             |

## Architecture at a glance

```text
Browser ──► frontend (Nginx) ──/api/*──► backend (Express) ──► db (PostgreSQL)
            localhost:8080               :3000                  :5432
```

| Service    | Image / build       | Host port                 | Notes                                     |
| ---------- | ------------------- | ------------------------- | ----------------------------------------- |
| `frontend` | `./frontend`        | **8080** → 80             | Serves static files, proxies `/api/`      |
| `backend`  | `./backend`         | 3000 (dev override only)  | REST API, migrations, retention job       |
| `db`       | `postgres:16-alpine`| none                      | Data persisted in the `pg_data` volume    |

All services share the private `app-net` network. `backend` starts after `db` is
healthy, and `frontend` starts after `backend` is healthy.

## Prerequisites

- **Docker Engine 24+** with **Docker Compose v2** (`docker compose`)
- **Git**
- Node.js 20 is only needed if you want to run the backend outside Docker

```bash
docker --version
docker compose version
```

## Getting started

```bash
git clone <repository-url>
cd sala-juntas-ibero
cp .env.example .env
```

Edit `.env` and set at least `DB_PASSWORD` and `JWT_SECRET`
(generate one with `openssl rand -hex 32`). Then start everything:

```bash
docker compose up --build
```

The first start builds the images and initialises the database. Once the
containers are healthy, open **http://localhost:8080**.

Verify the API through the proxy:

```bash
curl http://localhost:8080/api/health
```

**Default administrator** (created by `backend/db/seed.sql`):

| Email                       | Password    | Role                  |
| --------------------------- | ----------- | --------------------- |
| `julieta.esquinca@ibero.mx` | `Admin123!` | Secretary, super admin |

> The seeded password is for local use only. Change it after the first login in
> any shared or real environment.

Stop the stack:

```bash
docker compose down
```

## Environment variables

Configuration lives in `.env` (git-ignored). `.env.example` is the template.

| Variable                | Required | Default / example         | Purpose                                                  |
| ----------------------- | -------- | ------------------------- | -------------------------------------------------------- |
| `DB_HOST`               | yes      | `db`                      | Database host (compose service name)                     |
| `DB_PORT`               | yes      | `5432`                    | Database port                                            |
| `DB_NAME`               | yes      | `sala_juntas`             | Database name                                            |
| `DB_USER`               | yes      | `ibero`                   | Database user                                            |
| `DB_PASSWORD`           | yes      | *(set your own)*          | Database password                                        |
| `PORT`                  | no       | `3000`                    | Backend listening port                                   |
| `JWT_SECRET`            | yes      | *(set your own)*          | Secret used to sign auth tokens                          |
| `JWT_EXPIRES_IN`        | no       | `8h`                      | Token lifetime                                           |
| `APP_URL`               | no       | `http://localhost:8080`   | Public URL, used for CORS and links in emails            |
| `APP_TIMEZONE`          | no       | `America/Mexico_City`     | Timezone used when formatting dates in emails            |
| `DATA_RETENTION_MONTHS` | no       | `18`                      | Records older than this are purged automatically         |
| `SMTP_HOST`             | no       | *(blank)*                 | SMTP server. Leave the SMTP block blank to disable email |
| `SMTP_PORT`             | no       | `587`                     | SMTP port                                                |
| `SMTP_USER`             | no       | *(blank)*                 | SMTP account                                             |
| `SMTP_PASSWORD`         | no       | *(blank)*                 | SMTP password or app password                            |
| `SMTP_FROM`             | no       | *(blank)*                 | Sender. Must equal `SMTP_USER` on Microsoft 365          |
| `AI_PROVIDER`           | no       | `anthropic`               | AI assistant provider (feature is hidden in the UI)      |
| `AI_API_KEY`            | no       | *(blank)*                 | Leave blank to disable the AI assistant                  |
| `AI_MODEL`              | no       | *(provider default)*      | AI model name                                            |

The frontend container also reads `BACKEND_URL` (the upstream Nginx proxies
`/api/` to). Compose sets it to `http://backend:3000`; you should not need to
change it locally.

SMTP setup details are in [`docs/SMTP_ADMIN_GUIDE.md`](docs/SMTP_ADMIN_GUIDE.md).

## Database

**First start.** With an empty `pg_data` volume, PostgreSQL runs
`backend/db/schema.sql` and then `backend/db/seed.sql` (the default admin, an
initial room called "Sala Principal" and a few sample holidays).

**Every backend start.** The backend applies the SQL files in
`backend/db/migrations/` in order (currently `001` to `009`). Migrations are
idempotent, so they are safe to re-run. `009_rooms.sql` introduces rooms: it
creates the `rooms` table, seeds "Sala Principal" and assigns every existing
reservation to it.

Reset to a clean database (**deletes all data**):

```bash
docker compose down -v
docker compose up --build
```

Open a SQL shell:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Create a backup, or restore one:

```bash
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup.sql
```

Super administrators can also download a backup from the admin panel.

## Development workflow

`docker-compose.override.yml` is loaded automatically by `docker compose` and
turns the stack into a dev environment:

- **Backend:** source is bind-mounted, dependencies are installed on start and
  the server runs with `nodemon`, so it restarts when you save a file. The API
  is also exposed directly at http://localhost:3000.
- **Frontend:** `./frontend` is bind-mounted into Nginx, so edits show up on
  refresh with no rebuild.

Nginx tells browsers to cache `.js` and `.css` for a year. While developing,
hard-refresh (Cmd/Ctrl + Shift + R) or tick *Disable cache* in DevTools.

Useful commands:

```bash
docker compose logs -f backend      # follow backend logs
docker compose up --build -d        # rebuild after changing a Dockerfile or package.json
docker compose ps                   # service status and health
```

If port 8080 or 3000 is already in use, stop the other process or change the
left-hand side of the `ports:` mapping in the compose files.

## Project structure

```text
.
├── backend/
│   ├── server.js            # Express entry point
│   ├── db/                  # pool, schema.sql, seed.sql, migrate.js, migrations/
│   ├── middleware/          # JWT auth and role gate
│   ├── routes/              # REST endpoints (auth, reservations, calendar, users, ...)
│   └── utils/               # JWT, mailer, data-retention job
├── frontend/
│   ├── *.html               # Pages (login, dashboard, calendar, admin, history, stats)
│   ├── css/                 # Base, layout, components and per-page styles
│   ├── js/                  # core/ (api, router, store), modules/, components/, pages/
│   └── nginx/               # Nginx config template (BACKEND_URL is injected at start)
├── docs/                    # Deployment, runbook, ADRs, email docs, user manuals, design notes
├── scripts/legacy/          # One-off patch scripts, kept for history only
├── docker-compose.yml       # db + backend + frontend
├── docker-compose.override.yml  # Local dev overrides (hot reload)
└── .env.example             # Environment variable template
```

## Testing

There is **no automated test suite yet** (`npm test` is not defined). The repo
includes manual scripts that run against the dev database:

```bash
docker compose exec backend node test_db.js          # checks the main reservations query
docker compose exec backend node test_retention.js   # exercises the retention cleanup (dev DB only)
```

For a quick smoke test, check that the stack is healthy and the API answers:

```bash
docker compose ps
curl http://localhost:8080/api/health
```

## Documentation

| Document                                            | Content                                    |
| --------------------------------------------------- | ------------------------------------------ |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)          | Production architecture and setup          |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md)                | Operations, troubleshooting, rollback      |
| [`docs/ACCESS.md`](docs/ACCESS.md)                  | Accounts and access register               |
| [`docs/DATA_MIGRATION.md`](docs/DATA_MIGRATION.md) | Preloading the existing reservations from the Excel file; clearing old data (A/B), verification, rollback |
| [`docs/SERVER_CONFIGURATION.md`](docs/SERVER_CONFIGURATION.md) | Where every configuration lives (repo, server, Dokploy, Traefik, Cloudflare, tunnel) and how to check it |
| [`docs/WATCHDOG_AND_BACKUPS.md`](docs/WATCHDOG_AND_BACKUPS.md) | Server administrator guide: tunnel watchdog, e-mail alerts and where to change recipients, nightly backups, everyday commands, one-time migration commands |
| [`docs/PLAN_AVAILABILITY_AND_SECURITY.md`](docs/PLAN_AVAILABILITY_AND_SECURITY.md) | Plan (architecture unchanged) to detect tunnel failures, self-heal and alert by e-mail, and to harden server and app; includes the database cleanup order |
| [`docs/adr/`](docs/adr/README.md)                   | Architecture Decision Records              |
| [`docs/changes/`](docs/changes)                     | Change plans and records (bug fixes, features, multi-room) |
| [`docs/EMAIL_SYSTEM.md`](docs/EMAIL_SYSTEM.md)      | How email notifications work               |
| [`docs/SMTP_ADMIN_GUIDE.md`](docs/SMTP_ADMIN_GUIDE.md) | Configuring SMTP                        |
| [`docs/manual/`](docs/manual/README.md)             | User manuals (Spanish) with screenshots, plus the server administrator manual (architecture, operation, recovery) |
| [`docs/notes/`](docs/notes)                         | Historical design and status notes (outdated) |

## Academic context and license

Academic project developed for **Ingeniería de Software 2026** at
Universidad Iberoamericana, Ciudad de México, under professor
**Antonio Carlos Cardeña Matamoros**.

- **Project lead:** Wendy Elizabeth Guzmán Orta
- **Project sponsor:** Julieta Esquinca Gómez

Copyright © 2026 the project authors and Universidad Iberoamericana.
**All rights reserved.** This software was created for institutional use by the
university. It may not be copied, modified, or redistributed without written
permission from the authors and the university.
