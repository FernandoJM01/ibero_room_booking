# Runbook

Operational procedures for the production server `reservadeii`. Architecture is
in [DEPLOYMENT.md](DEPLOYMENT.md).

> **Status of these procedures.** Names (systemd unit, Swarm services, paths,
> hosts) were verified against the live server on 2026-09-21. The commands
> themselves are standard Docker, Swarm and systemd usage and were **documented,
> not executed**, during the inspection. Anything marked **(unverified)** needs
> a first careful run.

## Quick reference

| What                  | Value                                                             |
| --------------------- | ----------------------------------------------------------------- |
| Public URL            | `https://deii-salas.uk` (Cloudflare Worker)                       |
| Tunnel unit           | `devtunnel-reservations.service`                                  |
| Tunnel ID             | `ibero-reservas.usw3`                                          |
| Tunnel URL            | `https://npbkpmwc-80.usw3.devtunnels.ms`                          |
| Web service           | `iberoreservations-reservationsweb-rlrl5x`                        |
| API service           | `iberoreservations-reservationsapi-6ulakn`                        |
| DB service            | `iberoreservations-iberoreservationsdb-oi5kek`                    |
| DB volume             | `iberoreservations-iberoreservationsdb-oi5kek-data`               |
| Traefik container     | `dokploy-traefik`                                                 |
| Traefik config        | `/etc/dokploy/traefik/traefik.yml` and `dynamic/*.yml`            |
| App source on server  | `/etc/dokploy/applications/<service>/code/`                       |
| Dokploy UI            | `http://localhost:3000` through the SSH tunnel below              |

Docker needs root on this host: prefix every `docker` command with `sudo`.

## Common Operations

### Connect to the server and open Dokploy

```bash
ssh -J <user>@antares.dci.uia.mx <user>@<server-ip> -L 3000:127.0.0.1:3000
```

Keep the session open and browse to http://localhost:3000. Use `<server-ip>`
and accounts from the team's private notes.

### Health check

On the server, through Traefik (works without the Worker):

```bash
curl -s -H 'Host: npbkpmwc-80.usw3.devtunnels.ms' http://127.0.0.1/api/health
```

Expected: `{"ok":true,"timestamp":"..."}`. End to end:

```bash
curl -s https://deii-salas.uk/api/health
```

### Check status after a reboot or incident

```bash
sudo docker service ls                      # every service should show 1/1
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
systemctl status devtunnel-reservations --no-pager
```

### View logs

```bash
sudo docker service logs --tail 100 -f iberoreservations-reservationsapi-6ulakn
sudo docker service logs --tail 100 iberoreservations-reservationsweb-rlrl5x
sudo docker service logs --tail 100 iberoreservations-iberoreservationsdb-oi5kek
sudo docker logs --tail 100 dokploy-traefik
sudo journalctl -u devtunnel-reservations -n 100 --no-pager
```

### Deploy new code

1. Merge to `main` on GitHub (`FernandoJM01/ibero_room_booking`).
2. In Dokploy, open the application (`reservationsapi`, `reservationsweb`, or
   both if both changed) and click **Deploy**. Each one clones the repository
   and builds a local image.
3. Run the health check, then load the site with a hard refresh
   (Cmd/Ctrl + Shift + R) because static assets are cached for a year.

Deploys replace only the web and API containers (`start-first` rolling update).
The database service is untouched and its data volume persists. Migrations
`001` to `006` run automatically when the API starts.

### Restart a service without redeploying

```bash
sudo docker service update --force iberoreservations-reservationsapi-6ulakn
```

Replace the name to restart the web or DB service. The API and web use
`start-first`, so the new task starts before the old one stops. Avoid forcing
the DB service during grading; it drops connections.

### Restart the tunnel

```bash
sudo systemctl restart devtunnel-reservations
systemctl status devtunnel-reservations --no-pager
```

The unit restarts itself after failures (`Restart=always`, 5 s) and starts on
boot.

### Check and extend the tunnel expiry

```bash
/home/acardena/bin/devtunnel show ibero-reservas.usw3
```

`Tunnel Expiration: 30 days` was observed; the team notes it renews with
activity **(unverified)**. To extend, check the exact option first:

```bash
/home/acardena/bin/devtunnel update --help
```

Run tunnel commands as the account the service runs as. That account's
Microsoft login is what keeps the tunnel alive (see observation 11).

### Change the account that owns the Dev Tunnel

The tunnel `ibero-reservas.usw3` is owned by, and hosted with the cached
login of, **one individual Microsoft account** (the login of the server user
`acardena`). If that account is disabled the site goes down. Microsoft's CLI
reference confirms there is **no ownership transfer**: a tunnel is accessible
only to its creator. The procedure is therefore a **new tunnel under the new
account**, which gets a **new public URL** (a custom tunnel ID does not change
the URL). Do it outside grading windows. This procedure was performed
successfully on 2026-09-21 (see [DEPLOYMENT.md, change history](DEPLOYMENT.md#change-history)).

Facts from Microsoft's documentation (verified 2026-09-21): the CLI login is
cached per user and is "valid for several days before expiration"; tunnel
expiry is a **sliding inactivity window** of up to 30 days, renewed by any
activity; `devtunnel user login -d` (device code) is for machines without a
browser, and `-g` selects GitHub instead of Microsoft.

**Before starting:** pick the new account (a department-owned account is best,
otherwise a dedicated project account whose credentials and recovery are
documented); have SSH with `sudo`, the Dokploy UI (`-L 3000` tunnel) and edit
access to the Cloudflare Worker `plain-glitter-53dd` ready. Run every
`devtunnel` command as `acardena`, **without `sudo`**, because the login cache
is per user. Placeholders: `<NEW_ID>` (for example `ibero-reservas`) and
`<NEW_HOST>` (printed in step 3, for example `abc123xy-80.usw3.devtunnels.ms`).

1. **Log in with the new account** (device code; open the printed URL in a
   private browser window so it does not reuse the old account):
   ```bash
   /home/acardena/bin/devtunnel user login -d
   /home/acardena/bin/devtunnel user show
   ```
   Use `-g -d` for GitHub. The running tunnel keeps hosting from memory, so do
   not restart its unit until step 6.
2. **Create the tunnel and its port:**
   ```bash
   /home/acardena/bin/devtunnel create <NEW_ID> -a --expiration 30d
   /home/acardena/bin/devtunnel port create <NEW_ID> -p 80 --protocol http
   ```
3. **Start hosting to get the URL.** `devtunnel show` prints no URL until a host
   process is connected. Host it in the background of the SSH session (stop it
   later with `kill %1`):
   ```bash
   /home/acardena/bin/devtunnel host <NEW_ID> &
   ```
   Note `https://<NEW_HOST>` from the `Connect via browser:` line.
4. **Add the new host in Dokploy** (Application, **Domains**, add domain, HTTPS
   off), mirroring the current routes: web application, host `<NEW_HOST>`, path
   `/`, port `80`; API application, host `<NEW_HOST>`, path `/api`, port `3000`.
   Confirm on the server:
   ```bash
   sudo grep -n 'Host(' /etc/dokploy/traefik/dynamic/iberoreservations-*.yml
   curl -s -H 'Host: <NEW_HOST>' http://127.0.0.1/api/health
   ```
   Do not click Deploy just for this: it rebuilds from whatever is on `main`.
5. **Test the new tunnel end to end while the old one still serves.** The new
   tunnel is already hosting from step 3. Once the step 4 routes exist:
   ```bash
   curl -s https://<NEW_HOST>/api/health
   curl -sI https://<NEW_HOST>/ | head -1
   ```
   Both must succeed. The `Host` header in a manual `curl -H` must be the bare
   hostname, not a URL. A Traefik `404` means the Dokploy routes are not saved yet.
   Leave the background host running.
6. **Cut over the Worker.** In Cloudflare, Workers & Pages, `plain-glitter-53dd`,
   **Edit code**, use one constant for the origin and deploy:
   ```js
   const ORIGIN = "https://<NEW_HOST>";
   export default {
     async fetch(request) {
       const url = new URL(request.url);
       const target = new URL(url.pathname + url.search, ORIGIN);
       const proxyRequest = new Request(target, request);
       proxyRequest.headers.set("Host", new URL(ORIGIN).host);
       return fetch(proxyRequest);
     }
   }
   ```
   Then `curl -s https://deii-salas.uk/api/health` and load the site.
7. **Make it permanent.** Stop the manual host (find its PID with `pgrep -af devtunnel`, then
   `kill <PID>`; never the process the unit is running), then repoint the unit and
   restart it (a few seconds of downtime):
   ```bash
   sudo cp /etc/systemd/system/devtunnel-reservations.service ~/devtunnel-reservations.service.bak
   sudo sed -i 's/ibero-reservas.usw3/<NEW_ID>/' /etc/systemd/system/devtunnel-reservations.service
   sudo systemctl daemon-reload
   sudo systemctl restart devtunnel-reservations
   systemctl status devtunnel-reservations --no-pager
   curl -s https://deii-salas.uk/api/health
   ```
   The unit runs `devtunnel host` with the cached login, so this also proves the
   service authenticates without a terminal. **This is the point of no easy
   return**: the old account's login is no longer cached.
8. **Verify persistence.** At the next maintenance window reboot the server and
   confirm `systemctl status devtunnel-reservations` is active and the public
   health check passes. If the unit fails to authenticate, run step 1 again as
   `acardena` and restart the unit.
9. **Clean up.** The old tunnel stops receiving activity and expires by itself
   (no need to log back in to delete it). Remove the old-host routes in Dokploy,
   then update the tunnel ID, URL and owner in
   [DEPLOYMENT.md](DEPLOYMENT.md#5-internet-exposure), the quick reference above
   and the Worker source in DEPLOYMENT.md.

**Rollback.** Before step 6: run `kill %1` to stop the new host and remove the
new Dokploy domains; nothing public changed. After step 6, before step 7: in
Cloudflare open the Worker's **Deployments** tab and roll back to the previous
version (the old tunnel is still hosting). After step 7 the old login is gone,
so recovery means fixing the new tunnel, which already passed step 5.

**Ongoing check.** Because the cached login expires after "several days" and it
is not documented whether a running host renews it, check
`devtunnel user show` and `sudo journalctl -u devtunnel-reservations -n 50`
regularly and before grading. Repeat step 1 as `acardena` and restart the unit if
authentication errors appear.

### Add team members to the Cloudflare account

The Worker and the `deii-salas.uk` zone belong to one individual account. In the
Cloudflare dashboard, open **Manage Account, Members**, invite department or
teammate accounts with a suitable role, and record the domain's registrar
contact.

### Backup the database

```bash
sudo docker exec $(sudo docker ps -qf "name=iberoreservationsdb") \
  sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup_$(date +%F).sql
```

Copy the file off the server afterwards. Super administrators can also download
a backup from the admin panel (the API image's `pg_dump` is version 18.6,
matching the database).

### Restore a backup

Restoring overwrites current data. Take a fresh backup first.

```bash
sudo docker exec -i $(sudo docker ps -qf "name=iberoreservationsdb") \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup_YYYY-MM-DD.sql
```

A dump made with the command above (`--clean --if-exists`) drops and recreates
the objects it contains. Restart the API afterwards (see above).

### Reset the database from scratch

Destructive. Follow
[DEPLOYMENT.md, section 4](DEPLOYMENT.md#4-database-initialization).

### Edit environment variables

In Dokploy, open the application, change the **Environment** tab, then
**Deploy**. Variable names are listed in
[DEPLOYMENT.md, section 2](DEPLOYMENT.md#2-service-configuration-dokploy).

## Troubleshooting

Work from the outside in: public URL, tunnel, Traefik, services, database.

| Symptom | Likely cause | Check |
| ------- | ------------ | ----- |
| Public site down, Cloudflare error page | Tunnel down or expired | `systemctl status devtunnel-reservations`, `sudo journalctl -u devtunnel-reservations -n 50`, `devtunnel show ...` |
| Tunnel service failing to authenticate | Stored devtunnel login expired, or the individual Microsoft account behind it was disabled **(unverified)** | `sudo journalctl -u devtunnel-reservations`; `devtunnel user show` as `acardena`; re-login interactively as that account |
| Traefik `404 page not found` | No router matches the `Host` header | Files in `/etc/dokploy/traefik/dynamic/`; the Worker must send `Host: npbkpmwc-80.usw3.devtunnels.ms` |
| `502 Bad Gateway` from Traefik | Backend task not running | `sudo docker service ls`, `sudo docker service ps <service>` |
| Page loads but every API call fails | API down or unhealthy | API logs; `curl` the health endpoint |
| API logs show DB errors | DB service down, or credentials differ between `DB_*` and `POSTGRES_*` | DB service state and logs; compare env variable names in Dokploy |
| Cannot log in after a reset | Seed data restored the default admin password | See [DEPLOYMENT.md section 4](DEPLOYMENT.md#4-database-initialization) |
| Old UI after a deploy | Browser cached JS/CSS (1 year) | Hard refresh |
| `permission denied` on the Docker socket | Account is not in the `docker` group | Use `sudo docker ...` |
| Emails not sent | SMTP variables blank or wrong | API logs; [SMTP_ADMIN_GUIDE](SMTP_ADMIN_GUIDE.md) |
| Cannot open the Dokploy UI | SSH tunnel not running | Reconnect with the `-L 3000` command above |

A recent reboot causes a brief outage: Swarm restarts the tasks and the tunnel
unit starts on boot. If services are not `1/1` a few minutes later, use the
status commands above.

## Rollback Procedures

Because both application images are local `:latest` builds with no registry
(see [ADR 0001](adr/0001-container-orchestration-with-dokploy.md)), rolling
back means **rebuilding an earlier version of the code**, not pulling an old
image.

**Currently deployed:** commit `f383663` on `main` (recorded 2026-09-21). Note
this value before every deploy so there is a known good target.

### Roll back a bad code deploy (recommended)

1. On GitHub, revert the offending commit on `main`:
   ```bash
   git revert <bad-commit>
   git push origin main
   ```
2. In Dokploy, **Deploy** the affected applications (API and/or web).
3. Run the health check and load the site.

This keeps history linear and needs no changes on the server. Dokploy may also
offer rollbacks to previous deployments; this was **not verified** on v0.30.2.

### Automatic rollback by Swarm

The API service uses a rolling update with `start-first`, and
`FailureAction: rollback` if the new task fails. This protects against a task
that will not start; it restores the previous service definition, which uses the
same `:latest` tag, so it is **not** a substitute for the steps above
**(unverified)**.

### Roll back the database

Migrations are not reversible. Restore a backup taken before the change (see
[Restore a backup](#restore-a-backup)). Always back up before a deploy that
adds a migration.

### Restore the tunnel

If the tunnel is broken or expired, restart the unit first. If its owner account is gone, use [Change the account that owns the Dev Tunnel](#change-the-account-that-owns-the-dev-tunnel). If the tunnel ID is
gone, a new tunnel means a **new public URL**: update the Worker's target URL in
Cloudflare and the `Host` rules in
`/etc/dokploy/traefik/dynamic/iberoreservations-*.yml`.
