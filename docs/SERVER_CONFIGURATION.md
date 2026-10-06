# Where the configuration lives

A map of **every place where IberoReservations is configured**: the repository, the
server `reservadeii`, Dokploy, Traefik, the Dev Tunnel, Cloudflare and the external
accounts. Use it to answer "where do I change X?" and "what would we lose if the
server disappeared?".

Related documents: [DEPLOYMENT](DEPLOYMENT.md) (architecture and the 2026-09-21
inspection), [RUNBOOK](RUNBOOK.md) (procedures), [ACCESS](ACCESS.md) (who owns each
account), [ADRs](adr/README.md).

> **How much of this is verified?** Each row carries a status:
>
> - **Observed** — seen on the live server during the read-only inspection of
>   **2026-09-21** (recorded in [DEPLOYMENT](DEPLOYMENT.md)).
> - **Repo** — checked in this repository.
> - **Unverified** — standard behaviour of the tool, or not recorded anywhere. Confirm it
>   with the commands in [section 5](#5-verify-it-on-the-server-read-only).
>
> Nobody has re-inspected the production server since 2026-09-21. Nothing here
> contains secret values, only locations and names.

## 1. Short answer

| What | Where it lives | In Git? |
| ---- | -------------- | ------- |
| Application code, SQL, Dockerfiles, Nginx template | GitHub repository `FernandoJM01/ibero_room_booking`, branch `main` | **Yes** |
| Environment variables and secrets of the web, API and DB services | **Dokploy** (application, *Environment* tab) | **No** |
| Which domains point to which service, build source, deploy history | **Dokploy** (its own PostgreSQL, `dokploy-postgres`) | **No** |
| Traefik routing (static and per-application) | Files in `/etc/dokploy/traefik/` on the server | **No** |
| Database contents | Docker volume `iberoreservations-iberoreservationsdb-oi5kek-data` on the server | **No** |
| Public tunnel service | `/etc/systemd/system/devtunnel-reservations.service` on the server, plus the tunnel registered at Microsoft | **No** |
| Public proxy (Worker), DNS and the `deii-salas.uk` domain | **Cloudflare** account | **No** (the Worker source is only copied in [DEPLOYMENT §5](DEPLOYMENT.md#5-internet-exposure)) |
| Email (SMTP) mailbox | University IT; credentials in Dokploy variables | **No** |

Everything marked "No" would have to be rebuilt by hand if the server or an account
were lost; see [section 4](#4-if-the-server-or-an-account-is-lost).

## 2. Request path and who configures each hop

```text
Browser ─HTTPS─► Cloudflare (DNS + Worker "plain-glitter-53dd", domain deii-salas.uk)
                      │  Worker rewrites the URL and sets Host = tunnel host
                      ▼
          Microsoft Dev Tunnel relay  (tunnel ibero-reservas.usw3, owned by one Microsoft account)
                      │  outbound connection opened by the server
                      ▼
 reservadeii ─ systemd unit devtunnel-reservations ─► Traefik :80  (/etc/dokploy/traefik/*)
                                                         ├─ any path ─► web   (Nginx, Docker Swarm service)
                                                         └─ /api     ─► API   (Node.js, Swarm service) ─► PostgreSQL 18 (Swarm service + volume)
                         All three services are created and configured in Dokploy.
```

## 3. Inventory

### 3.1 Repository (versioned)

| Item | File or place | Notes | Status |
| ---- | ------------- | ----- | ------ |
| API image | `backend/Dockerfile` | `node:20-alpine`, installs production dependencies, runs `node server.js`. Does not use `package-lock.json` (it is deleted at build) | Repo |
| Web image | `frontend/Dockerfile` | `nginx:alpine`, copies the static files and the template below | Repo |
| Nginx configuration | `frontend/nginx/default.conf.template` | Rendered at container start; only `${BACKEND_URL}` is substituted. Sets one-year caching for static assets (hence the `?v=N` rule) | Repo |
| API address used by Nginx | `ENV BACKEND_URL=http://iberoreservations-reservationsapi-6ulakn:3000` in `frontend/Dockerfile` | **Tied to the Dokploy service name.** If that service is recreated with another name, the web container stops reaching the API until this value (or a Dokploy variable) is changed | Repo, Observed |
| Database schema, seed, migrations | `backend/db/schema.sql`, `seed.sql`, `migrations/*.sql` | Migrations run automatically on every API start; schema and seed are loaded by hand ([DEPLOYMENT §4](DEPLOYMENT.md#4-database-initialization)) | Repo, Observed |
| Variable names and defaults | `.env.example` (template), `README.md` (table) | The real `.env` is git-ignored and only exists on developer machines | Repo |
| Local development stack | `docker-compose.yml`, `docker-compose.override.yml` | **Not used in production.** Production uses Dokploy | Repo |
| Leftover Render.com config | `render.yaml` | Describes an earlier deployment on Render. Nothing references it; production is Dokploy ([ADR 0001](adr/0001-container-orchestration-with-dokploy.md)). Safe to delete once the team agrees | Repo |

### 3.2 The server `reservadeii`

| Item | Location | Notes | Status |
| ---- | -------- | ----- | ------ |
| Host | `reservadeii`, Ubuntu 24.04, reached by SSH through the jump host `antares.dci.uia.mx` | Institutional network, no inbound access from the internet | Observed |
| Docker and Swarm | Single-node Swarm (the node is leader and manager). Swarm state is kept by Docker, normally under `/var/lib/docker/swarm` | The three application services are Swarm services, not Compose | Observed (path unverified) |
| **Dokploy** | Runs on the Swarm (v0.30.2; Traefik reaches it as `dokploy:3000`), UI on port 3000 (bound to all interfaces), used through the `ssh -L 3000` tunnel | The control panel for everything below | Observed |
| **Dokploy's own data** | Its PostgreSQL 16 (`dokploy-postgres`) stores applications, domains, environment variables and deployment history. Its storage volume is not recorded | Back this up: it is the only copy of the application settings | Observed (volume unverified) |
| **Dokploy files** | `/etc/dokploy/` (permissions `drwxrwxrwx`, see [observation 5](DEPLOYMENT.md#7-observations--recommendations)) | Holds the Traefik configuration and the application clones | Observed |
| **Application source on the server** | `/etc/dokploy/applications/<service>/code/` | A `git clone` of `main`; the images are built from it on the server | Observed |
| **Application environment variables** | Dokploy → application → **Environment** tab. Injected into the Swarm service as environment variables | Names: `DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD JWT_SECRET JWT_EXPIRES_IN PORT SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM APP_URL AI_PROVIDER AI_API_KEY AI_MODEL` (API); `POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD` (DB); none for the web. Values are never written in the repository | Observed |
| Variables that are **not set** | `DATA_RETENTION_MONTHS`, `APP_TIMEZONE` | Code defaults apply: 18 months and `America/Mexico_City` | Observed |
| **Docker images** | Local images `iberoreservations-<service>:latest`, built on the server. There is no registry | Rolling back means rebuilding an older commit | Observed |
| **Traefik static configuration** | `/etc/dokploy/traefik/traefik.yml` (container `dokploy-traefik`, Traefik 3.6.7) | Entry points `web` :80 and `websecure` :443, providers `swarm`, `docker` and `file` | Observed |
| **Traefik routes** | `/etc/dokploy/traefik/dynamic/*.yml`; per application `iberoreservations-*.yml`; `middlewares.yml` | Created by Dokploy's **Domains** tab. Editing by hand may be overwritten the next time Dokploy saves the domains | Observed (overwrite behaviour unverified) |
| Certificates | `/etc/dokploy/traefik/dynamic/acme.json` | Empty: TLS is terminated by Cloudflare and the Dev Tunnel, not by the server | Observed |
| **Database data** | Docker volume `iberoreservations-iberoreservationsdb-oi5kek-data`, mounted at `/var/lib/postgresql/18/docker` in the `postgres:18` service. On the host it lives under Docker's volume directory (normally `/var/lib/docker/volumes/…`) | Contains personal data. Survives deploys; does not survive deleting the service and volume | Observed (host path unverified) |
| **Tunnel service** | `/etc/systemd/system/devtunnel-reservations.service`; backup of the previous unit in `~/devtunnel-reservations.service.bak` of the account that made the change | Runs `/home/acardena/bin/devtunnel host ibero-reservas.usw3 --allow-anonymous` as user `acardena`, `Restart=always` | Observed |
| **Tunnel login** | Cached per user, for the Microsoft account used with `devtunnel user login` as `acardena` | Where the cache lives is not recorded. If this login expires or the account is disabled, the site goes down | Observed (location unverified) |
| `cloudflared` | Installed, service disabled and not running | Not part of the live path ([ADR 0003](adr/0003-institutional-network-egress-restrictions.md)) | Observed |
| SSH access | `sshd`; each person's key in their own account | Offboarding steps in [ACCESS](ACCESS.md#offboarding-checklist-when-a-team-member-leaves) | Unverified |
| Backups | Database dumps are manual (`pg_dump`, see [RUNBOOK](RUNBOOK.md#backup-the-database)) and the Respaldos tab downloads an SQL file. **There are no automatic off-server backups** | Listed as a known limitation | Observed |

### 3.3 External services

| Item | Where | Notes | Status |
| ---- | ----- | ----- | ------ |
| **Cloudflare Worker** | Cloudflare dashboard → *Workers & Pages* → `plain-glitter-53dd` → *Edit code* | The proxy script **exists only there** (a copy is in [DEPLOYMENT §5](DEPLOYMENT.md#5-internet-exposure)). Attached to `deii-salas.uk` as a Custom Domain; its `workers.dev` URL is also enabled | Observed |
| **DNS and domain** | Cloudflare zone `deii-salas.uk` | Registrar, renewal date and owner are **not documented** | Observed (registrar unknown) |
| **Dev Tunnel** | Registered at Microsoft under one individual's account: ID `ibero-reservas.usw3`, expires after 30 days of inactivity (sliding window) | See [RUNBOOK](RUNBOOK.md#check-and-extend-the-tunnel-expiry). No ownership transfer exists | Observed |
| **Source repository** | GitHub `FernandoJM01/ibero_room_booking` | The credential Dokploy uses to clone it (token or deploy key) is stored in Dokploy | Observed (credential type unverified) |
| **Email (SMTP)** | A university mailbox; `SMTP_*` variables in Dokploy | Which mailbox and who owns it: `TBD` in [ACCESS](ACCESS.md) | Observed (owner unknown) |
| AI provider | Optional; `AI_API_KEY` in Dokploy, blank disables | The assistant is hidden in the UI | Repo |
| Secrets register | [ACCESS](ACCESS.md) names owners and locations; actual values belong in the team's password manager | Several rows are still `TBD` | Repo |

## 4. If the server or an account is lost

| Lost | What you need to recreate | Where the information is |
| ---- | ------------------------- | ------------------------ |
| Application code | Nothing: clone GitHub | Repository |
| Dokploy settings (applications, domains, variables) | Re-create the three applications, their domains and every variable | **Variable names**: section 3.2 here and `.env.example`. **Values**: the password manager (should hold `JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASSWORD`, `AI_API_KEY`). **Domains**: [DEPLOYMENT §3](DEPLOYMENT.md#3-routing--reverse-proxy-traefik). If Dokploy's database was not backed up, this is rebuilt from documentation |
| Traefik files | Regenerate by re-adding the domains in Dokploy | [DEPLOYMENT §3](DEPLOYMENT.md#3-routing--reverse-proxy-traefik) and [RUNBOOK](RUNBOOK.md#change-the-account-that-owns-the-dev-tunnel) step 4 |
| Database | Restore the latest dump into a new PostgreSQL service | **Only exists if someone downloaded one.** [RUNBOOK](RUNBOOK.md#restore-a-backup) |
| Tunnel unit or login | Recreate the systemd unit and log in again with a Microsoft account | [RUNBOOK](RUNBOOK.md#change-the-account-that-owns-the-dev-tunnel) |
| Cloudflare Worker | Paste the script back and attach the custom domain | [DEPLOYMENT §5](DEPLOYMENT.md#5-internet-exposure) (the only copy) |
| Domain or Cloudflare account | Recover through the registrar or Cloudflare | **Not documented** |

## 5. Verify it on the server (read-only)

Run these as an administrator of `reservadeii` (for example over the SSH session described
in the [RUNBOOK](RUNBOOK.md#connect-to-the-server-and-open-dokploy)). **None of them
changes anything and none prints a secret value.** Compare each result with the "expected"
column; anything different means this document needs updating.

| # | Check | Command | Expected |
| - | ----- | ------- | -------- |
| 1 | The three services exist | `sudo docker service ls` | `iberoreservations-reservationsweb-…`, `…-reservationsapi-…` and `…-iberoreservationsdb-…`, all `1/1`. Dokploy's own services are also listed; write their exact names into section 3.2 |
| 2 | Dokploy and Traefik files | `sudo ls -la /etc/dokploy /etc/dokploy/traefik /etc/dokploy/traefik/dynamic /etc/dokploy/applications` | `traefik.yml`, `dynamic/` with `iberoreservations-*.yml`, `middlewares.yml`, `acme.json`; one folder per application |
| 3 | What Traefik routes | `sudo grep -n 'Host(' /etc/dokploy/traefik/dynamic/iberoreservations-*.yml` | The tunnel host `npbkpmwc-80.usw3.devtunnels.ms` (web and `/api`), `deii-salas.uk`, `localhost` |
| 4 | Variable **names** of the API (no values) | `sudo docker service inspect iberoreservations-reservationsapi-6ulakn --format '{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}' \| cut -d= -f1` | The names listed in section 3.2 |
| 5 | Where the database lives | `sudo docker service inspect iberoreservations-iberoreservationsdb-oi5kek --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}'` then `sudo docker volume inspect iberoreservations-iberoreservationsdb-oi5kek-data --format '{{.Mountpoint}}'` | Volume mounted at `/var/lib/postgresql/18/docker`; a path under `/var/lib/docker/volumes/` |
| 6 | Where Dokploy keeps its own data | `sudo docker service inspect dokploy-postgres --format '{{json .Spec.TaskTemplate.ContainerSpec.Mounts}}'` (and the same for `dokploy`; if either is a plain container instead of a service, use `sudo docker inspect <name> --format '{{json .Mounts}}'`) | **Unrecorded today.** Write the volume names and host paths into section 3.2 |
| 7 | Tunnel service | `systemctl cat devtunnel-reservations` and `systemctl is-enabled devtunnel-reservations` | `ExecStart` with `devtunnel host ibero-reservas.usw3 --allow-anonymous`, `User=acardena`, `Restart=always`; `enabled` |
| 8 | Tunnel registration and owner | `/home/acardena/bin/devtunnel show ibero-reservas.usw3` (as `acardena`, without `sudo`) | The tunnel, port 80, and its expiry |
| 9 | Where the tunnel login is cached | `sudo -u acardena sh -c 'ls -la ~/.local/share ~/.config 2>/dev/null \| grep -i tunnel'` | **Unrecorded today.** Write the path into section 3.2 |
| 10 | Which commit is deployed | `sudo git -C /etc/dokploy/applications/<service>/code log -1 --oneline` | Compare with the commit recorded in [RUNBOOK](RUNBOOK.md#rollback-procedures). It should now include migrations `007`–`009` once the multi-room release is deployed |
| 11 | End to end | `curl -s https://deii-salas.uk/api/health` | `{"ok":true,…}` |

Outside the server, someone with the right login should also confirm, and write down in
[ACCESS](ACCESS.md):

- **Cloudflare:** *Workers & Pages → plain-glitter-53dd* shows the same script as
  [DEPLOYMENT §5](DEPLOYMENT.md#5-internet-exposure); *DNS* lists `deii-salas.uk`; who the
  account members are.
- **Domain registrar** for `deii-salas.uk`: provider, owner and renewal date.
- **Microsoft account** that owns the tunnel (`devtunnel user show`).
- **Dokploy → each application → Environment** has every name from section 3.2, and the
  values are also in the team's password manager.

## 6. Gaps worth closing

1. **Back up Dokploy's own database** and write down where its volume is (check 6). Today
   the application settings exist only there.
2. **Keep the Worker script in the repository** (for example `infra/cloudflare-worker.js`)
   so it is versioned and not only in the Cloudflare dashboard.
3. **Record the registrar and renewal date** of `deii-salas.uk`, and give a second person
   access to Cloudflare, the Microsoft tunnel account and Dokploy ([ACCESS](ACCESS.md)).
4. **Automate off-server database backups**; today a backup exists only if somebody downloads it.
5. **Decouple the web image from the Dokploy service name** by setting `BACKEND_URL` in
   Dokploy instead of relying on the default baked into `frontend/Dockerfile`.
6. Delete the unused `render.yaml` once the team agrees.
