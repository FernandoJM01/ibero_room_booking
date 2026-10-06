# Plan: keep the site always online, and harden it

Status: **proposal for approval** (nothing in this plan has been applied to the server). Written 2026-10-06 from the
read-only audit of the same day ([SERVER_CONFIGURATION](SERVER_CONFIGURATION.md)), the incident history in
[DEPLOYMENT](DEPLOYMENT.md) and a review of the API code.

Audience: whoever owns the project and whoever administers `reservadeii`. Commands that need `sudo` are marked
**[sudo]**; the person at the keyboard types the password, it is never shared.

## 1. Why the site goes down, and what is already known

The public path has five links, any of which can fail on its own:

```
browser > Cloudflare (DNS + Worker) > Microsoft Dev Tunnel relay > devtunnel process on the server > Traefik > web / API > PostgreSQL
            [1]                          [2]                         [3]                               [4]     [5]
```

| # | Link | How it fails | Seen so far | Does it recover alone? |
| - | ---- | ------------ | ----------- | ---------------------- |
| 1 | Cloudflare Worker / domain | Worker points to a tunnel URL that changed; domain expires; account access lost | Only when the tunnel was recreated (2026-09-21) | No (manual edit) |
| 2 | Dev Tunnel service | **Tunnel expires** (default lifetime 30 days unless extended), Microsoft outage, rate limit | Not yet; the tunnel `ibero-reservas.usw3` was created 2026-09-21, so a 30-day expiry would fall around **2026-10-21** (to be confirmed, see P0-1) | No |
| 3 | `devtunnel host` process | **Alive but disconnected**: "Not authorized ... refreshed tunnel access token is not valid". systemd sees a running process and never restarts it | **2026-09-29 (~29 h) and 2026-10-02 (~91 h)** | **No**, until a person restarts it |
| 4 | Traefik / containers | Container crash, bad deploy, disk full | Not seen | Yes (Swarm restarts, rollback on failed deploy) |
| 5 | Database | Disk, corruption, restart | Not seen | Yes (restart), data only if backed up (there is **no automatic backup**) |

Both real outages were link 3, and each was found by a person noticing, not by a system. So the plan has two goals:
**find out within minutes** (detection and alerting) and **fix the common failure without a person** (self-healing),
then **remove the fragile link** (structural fix).

## 2. The watchdog, explained

### What problem it solves

`devtunnel-reservations.service` has `Restart=always`. That only helps when the process **exits**. In the failures
above the process kept running while its connection to Microsoft was dead, so systemd considered the service healthy.
The site was down for days with a green service.

### What it does

[`infra/tunnel-watchdog/`](../infra/tunnel-watchdog/README.md) adds a second, independent check. A systemd timer runs
a small script every 2 minutes:

```
every 2 min
  call https://<tunnel host>/api/health   (the same path real users take, minus Cloudflare)
  ├─ answers 200 ................ healthy: reset the failure counter, stop
  └─ fails
       count the failure; if fewer than 2 in a row: stop (avoid reacting to a blip)
       ask Traefik locally: curl -H "Host: <tunnel host>" http://127.0.0.1/api/health
       ├─ local app also fails ... the problem is the app, not the tunnel: do NOT restart; log why
       └─ local app is fine
            restarted in the last 10 min? yes: stop (throttle)
            no: systemctl restart devtunnel-reservations, record the time
```

So the worst case from "tunnel silently dead" to "restarted" is about **4-6 minutes** instead of days. Every decision
is written to the journal (`journalctl -t devtunnel-watchdog`). Its decision logic was tested with mocked `curl` and
`systemctl` (healthy, one failure, two failures, throttling, app down, recovery).

### What it cannot do (and why more is needed)

1. **It cannot renew a Microsoft login.** If the cause is an expired or revoked login, restarting just fails again
   and the watchdog will keep trying every 10 minutes. A person must run `devtunnel user login -d` as `acardena`.
2. **It tells nobody.** It heals silently; if it cannot heal, nobody knows. It needs an alert channel (section 4).
3. **It lives on the same machine it protects.** If the server, its network or its power is down, it is down too.
   Only an external monitor sees that.
4. **It does not extend the tunnel's expiry.** An expired tunnel must be extended or recreated.
5. **It watches one URL.** It does not know the Worker, the domain or the certificate.

> One thing to fix before installing it: the script's default tunnel host must be the **current** one
> (`npbkpmwc-80.usw3.devtunnels.ms`). Traefik still routes a **retired** host (`5x0zgl8x-80...`); the server audit
> tested that one by mistake (the audit script is fixed, it now tests every configured host). If the watchdog ever
> pointed at a retired host it would see "tunnel down, app up" forever and restart the tunnel every 10 minutes.
> The install step below verifies the host with `devtunnel show` first.

## 3. Target design: defence in depth

| Layer | Purpose | Mechanism |
| ----- | ------- | --------- |
| A. External monitor | Know within 1-5 min, from outside, that users cannot reach the site; also catches Worker, domain, certificate, whole-server and network failures | Free HTTP monitor (UptimeRobot, Better Stack or Cloudflare Health Checks) on `https://deii-salas.uk/api/health`, checking for `"ok":true`; alert by email **and** a second channel (Teams/WhatsApp/SMS) to at least **two people** |
| B. Self-healing on the server | Fix the known failure without a person | Tunnel watchdog (section 2), extended with an alert when it restarts and when a restart did not help (3 restarts in an hour) |
| C. Heartbeat out | Detect "the server cannot talk to the internet at all", which an inbound monitor cannot tell apart from "tunnel down" | The watchdog also pings a dead-man's-switch URL (healthchecks.io style) after each healthy run; silence for 10 min alerts |
| D. Safe changes | Stop self-inflicted outages | Deploy with `start-first` and rollback (already configured); run `docs/RUNBOOK` smoke test after each deploy; no deploys during school hours |
| E. Recoverability | Come back from a bad day | Nightly `pg_dump` kept 14 days, copied **off** the server; documented, rehearsed restore; second administrator who has every access in the handover sheet |
| F. Remove the fragile link | Stop depending on one person's Microsoft login and a 30-day tunnel | Structural options below |

### Structural options for link 2-3 (pick one)

| Option | Idea | Pros | Cons / unknowns | Effort |
| ------ | ---- | ---- | --------------- | ------ |
| **1. Keep Dev Tunnel, harden it** (baseline) | Extend expiry, watchdog, monitor, a documented re-login procedure | No network change; can be done this week | Still depends on a personal Microsoft login and on a developer-oriented service with a 20 MB/s cap and expiry; failure mode is only mitigated | 0.5 day |
| **2. Cloudflare Tunnel (`cloudflared`) over QUIC** | A *named* tunnel owned by the Cloudflare account that already has the domain; token-based, no personal login, built for production, removes the Worker and the Dev Tunnel | Most robust and simplest chain: browser > Cloudflare > server. `cloudflared` is already installed (disabled) | TCP 7844 is blocked by the campus firewall (tested 2026-09-21). **UDP 7844 (QUIC) was never tested**; if it is open this is the best option, otherwise IT must open 7844 outbound | 0.5 day to test, 1 day to switch |
| **3. Ask IT for a proper inbound path** | A campus reverse proxy / public DNS name or NAT of 443 to the server, still behind Cloudflare | What a production service normally uses; no third-party tunnel | Needs IT approval, a firewall rule and a certificate owner; weeks | Depends on IT |
| **4. Host it elsewhere** | University cloud/VM with a public address | Independent of the campus network | Cost, data location, migration | Days |

**Recommendation:** do option 1 now (it is cheap and fixes the immediate risk), and in parallel run the one test that
decides option 2 (section 5, P1-6). If QUIC works, switch to option 2 and keep the Dev Tunnel as the documented
fallback. In any case start the request to IT (option 3) as the long-term home, because it also fixes ownership.

## 4. Security review

Evidence is the audit of 2026-10-06 and the code in `backend/`. **Severity** = likelihood x impact for this system
(a small internal reservation tool with personal data of staff). Items marked **to verify** could not be proven from
here and have a test attached.

### Server and network

| ID | Finding | Evidence | Severity | Fix | Verify |
| -- | ------- | -------- | -------- | --- | ------ |
| S1 | **SSH accepts passwords**, root login allowed with keys, X11 forwarding on, no key installed for `admlocal` | `passwordauthentication yes`, `permitrootlogin without-password`, `x11forwarding yes`, 0 keys for root/admlocal | High | Install a key for each administrator (and keep one already-logged-in session), then `PasswordAuthentication no`, `PermitRootLogin no`, `X11Forwarding no`, `MaxAuthTries 3`, `ClientAliveInterval 300` in a `/etc/ssh/sshd_config.d/` drop-in. Test in a **second** session before closing the first | New key login works; password login is refused |
| S2 | **Dokploy panel (port 3000) is open to the whole network over plain HTTP** | `ufw` allows 3000 from Anywhere; Dokploy publishes `0.0.0.0:3000`; the panel controls Docker (full control of the host) | High | Remove the UFW rule and reach the panel only through an SSH tunnel (`ssh -J ... -L 3000:127.0.0.1:3000`, which is already how it is used). **Docker-published ports can bypass UFW**, so also add a `DOCKER-USER` rule or re-publish as `127.0.0.1:3000:3000` | From another host on the campus network, `curl -m 5 http://<server>:3000` must time out |
| S3 | **Ports 80/443 are open to the network** although the tunnel connects locally | UFW allows 80, 443; Traefik publishes them | Medium | The tunnel and the Worker only need Traefik on the server itself. Restrict 80/443 to localhost/known admin hosts (same Docker/UFW caveat as S2) after confirming the tunnel still works | Site still answers via the public URL; `curl` from another host is refused |
| S4 | **Traefik dashboard API is `insecure: true`** | `api: insecure: true` in `traefik.yml` | Low now (port 8080 is not published), High if it ever is | Set `insecure: false` or remove the `api` block in Dokploy's Traefik settings; never publish 8080 | `curl http://127.0.0.1:8080/api/rawdata` fails |
| S5 | **Stale and unexpected routes** | Routers for `localhost`, `reservas.local`, `dokploy.docker.localhost`, the retired tunnel host `5x0zgl8x-80...`, and `deii-salas.uk` served directly | Low | Delete the dead routes in Dokploy **Domains**; keep only the current tunnel host (and `deii-salas.uk` only if it is needed) | `ls /etc/dokploy/traefik/dynamic/` shows only the intended hosts |
| S6 | **38 pending updates and a pending reboot** (up 18 days); not attached to Ubuntu Pro | `*** System restart required ***`, 38 upgradable (0 security) | Medium | Schedule a reboot in a maintenance window (see P1-4). Enable unattended security upgrades (already active). Optionally attach the free Ubuntu Pro tier for livepatch/ESM | `uptime`, no restart flag |
| S7 | **Docker logs unrotated** (no `daemon.json`), 11 GB free of 29 GB | no `/etc/docker/daemon.json` | Medium (outage by full disk) | Add `log-driver json-file` with `max-size 10m`, `max-file 3`; restart Docker in a window | `docker info`, disk alert at 80% |
| S8 | **No backups** | Only a 26 KB dump from 2026-09-24; no cron/timer for dumps | **High** (data loss) | Nightly dump, 14-day retention, copied off the server (section 5, P1-3) | A restore into a scratch DB succeeds monthly |
| S9 | **Shared/ownerless accounts**: `admlocal` has no named owner; both administrators are in `sudo`; the `acardena` account also holds the tunnel login | `/etc/group`, systemd unit | Medium | Name an owner for `admlocal` or lock it; one account per person; consider a dedicated service user for the tunnel, and a second person able to log in to Microsoft for it | Handover sheet filled in |
| S10 | **Dokploy and Traefik mount `/var/run/docker.sock`** | service mounts | Informational | Accepted by design (root-equivalent). It makes S2 and S1 more important | none |
| S11 | **Two public entry points** exist: the Worker (`deii-salas.uk`, `workers.dev`) and the tunnel URL itself (anonymous connect), so Cloudflare protections can be bypassed | ADR 0004 | Medium | Disable the `workers.dev` route; if the tunnel moves to `cloudflared`, the direct URL disappears. Until then add a **shared secret header** set by the Worker and checked by Traefik/the API, so direct hits are refused | A request to the tunnel URL without the header gets 403 |
| S12 | **TLS ACME email is a placeholder** (`...@localhost.com`) and `acme.json` is empty | `traefik.yml` | Low | Set a real contact in Dokploy (no certificate is issued here; TLS ends at Cloudflare/the tunnel) | n/a |

### Application (code review of `backend/`)

| ID | Finding | Evidence | Severity | Fix | Verify |
| -- | ------- | -------- | -------- | --- | ------ |
| A1 | **Login rate limit may be one shared bucket, or bypassable** | `trust proxy 1` with four hops in front; per-IP key | **High (to verify)** | Run the existing RUNBOOK test "Verify the login rate limit" (Test A from a phone on mobile data, Test B on the server). If shared, trust the Cloudflare header (`CF-Connecting-IP`, accepted only when the request comes from the Worker) and key the limiter on it, plus a per-account counter | Test A shows `4` from a second network |
| A2 | **Seed contains a real person's account with a public default password** | `seed.sql` (hash of the password written in the README) | **High after a full reset** | Never leave it in service: immediately set a private password in the same maintenance window (helper in section 6), and ask the owner to change it at first login | Default password no longer logs in |
| A3 | **JWT secret falls back to `dev_secret_key`** if the variable is missing | `utils/jwt.js` | Medium | Make the API **refuse to start** in production without `JWT_SECRET` (and require 32+ random characters). The variable exists in Dokploy today; this removes the chance of silent regression | Start without the variable: the API exits with a clear error |
| A4 | **Tokens live 8 h and are bearer tokens kept by the browser; no revocation** | `jwt.js`, `middleware/auth.js` | Low-Medium | Accept for now; on password change or deactivation, check `active`/a token version in `auth` so old tokens stop working | Deactivated user's token returns 401 |
| A5 | **No Content-Security-Policy** (disabled because of inline handlers) | `server.js` | Medium | A dedicated CSP pass (move inline handlers, then enforce `script-src 'self'`). Until then keep input escaping tests | Browser console shows no CSP violations |
| A6 | **CORS** is restricted to `APP_URL` when set | `server.js` | Low | Confirm `APP_URL=https://deii-salas.uk` in production | `curl -H 'Origin: https://evil.example'` gets no allow header |
| A7 | **Secrets are plain environment variables** on the API service (DB, JWT, SMTP, AI key) | audit lists the names | Low-Medium | Move to Docker secrets / Dokploy secrets when convenient; rotate on any suspicion; never in the repo (already respected) | n/a |
| A8 | Good practices already present | helmet, 100 kb body cap, rate-limited login, bcrypt hashes, password strength rule, academic privacy (404 on others' reservations, anonymised busy slots), migrations idempotent | n/a | Keep | n/a |

## 5. Phased implementation plan

Order matters: protect and observe first, then change risky things one at a time, each with a test and a way back.

### Phase 0: today, no server changes (about 1 hour, whoever has the accounts)

| # | Action | Done when |
| - | ------ | --------- |
| P0-1 | **Check the tunnel expiry.** On the server as `acardena`: `~/bin/devtunnel show ibero-reservas.usw3` and read *Expiration*. If under 14 days, extend now: `~/bin/devtunnel update ibero-reservas.usw3 --expiration 30d` (confirm the flag with `devtunnel update -h`; repeat it in the calendar every 20 days until option 2/3 replaces it) | Expiry date written in the RUNBOOK and in a shared calendar with two people invited |
| P0-2 | **Create the external monitor** (Layer A) on `https://deii-salas.uk/api/health`, keyword `"ok":true`, 1-5 min interval, alerts to at least two people by email plus a second channel | Pausing the tunnel for 5 minutes in a test produces an alert (do this test together with P1-1) |
| P0-3 | Run the **login rate-limit test** (A1) with a phone | Result recorded in the RUNBOOK |
| P0-4 | Confirm the **2026-10-06 deploy** of commit `74efe0c` was made on purpose, and who deploys | Name in DEPLOYMENT |
| P0-5 | Open an **IT request**: (a) outbound UDP 7844 / TCP 7844 to Cloudflare, (b) a proper inbound path or reverse proxy (option 3), (c) a named institutional owner for the server | Ticket number recorded |

### Phase 1: this week, in a maintenance window (**[sudo]**, about half a day)

Take these in order. Tell the secretaries the site will be unavailable for a few minutes.

| # | Action | Test | Roll back |
| - | ------ | ---- | --------- |
| P1-1 | **Install the watchdog** after fixing its host: confirm the host with `devtunnel show`, run it by hand once (no output = healthy), then enable the timer ([README](../infra/tunnel-watchdog/README.md)). **Test:** simulate the real failure (process alive, not answering) with `sudo systemctl kill -s STOP devtunnel-reservations`, and watch `journalctl -t devtunnel-watchdog -f`: expect a restart within about 6 min (a stopped process only dies after systemd's 90 s stop timeout); also confirm that P0-2 alerts | Site back by itself; journal shows the decisions | `sudo systemctl disable --now devtunnel-watchdog.timer` |
| P1-2 | **Add alerts to the watchdog**: a notify call (email via the existing SMTP account, or a webhook to Teams) when it restarts the tunnel, and a "restart did not help" alert after 3 restarts in an hour; plus the heartbeat ping (Layer C). Small change to the script, re-run its mocked tests | Test restart sends one message; a stuck case sends the "needs a person" message | Remove the notify lines |
| P1-3 | **Backups.** A systemd timer (daily 02:00) that runs the documented `pg_dump`, writes to `/var/backups/ibero/` as `backup_YYYY-MM-DD.sql.gz` with mode 600, keeps 14, and copies the newest off the server (university file share or another host the team controls). Add disk-space and "last backup older than 26 h" alerts | A restore of last night's file into a scratch database works | Disable the timer |
| P1-4 | **Reboot and updates.** `apt upgrade`, reboot, then verify that everything **comes back alone**: Docker, Swarm services, Traefik, `devtunnel-reservations`, the watchdog timer. This is also the proof that the "always online" design survives a power event | After reboot the site answers within 5 min without anyone logging in | Boot previous kernel from GRUB |
| P1-5 | **Docker log rotation** (S7) at the same reboot | `docker info` shows the limits | Remove `daemon.json` |
| P1-6 | **Decide option 2 with data.** Start a throwaway quick tunnel from the server: `cloudflared tunnel --url http://127.0.0.1:80 --protocol quic` for 1 minute and see whether it connects (it prints a random public URL; it serves the app while it runs, so stop it right after, and do it outside school hours). Connects = QUIC is open | Result recorded in ADR 0003's open item | `Ctrl+C` |
| P1-7 | **SSH hardening** (S1). Keep your current session open; add keys; drop-in config; `sudo sshd -t`; reload; test a new login from a second terminal; only then close the first | New key login OK; passwords refused | Edit the drop-in back from the open session |
| P1-8 | **Close the Dokploy port** (S2) and, if confirmed safe, 80/443 to the network (S3). Do it **after** SSH keys, so you cannot lock yourself out | From another campus host, 3000 and 80 time out; public site still works | `ufw allow 3000/tcp`; re-publish |

### Phase 2: next 2-4 weeks (no downtime, can be done by the developer through Dokploy)

| # | Action |
| - | ------ |
| P2-1 | Delete stale routes and set a real ACME contact (S5, S12); turn off the Traefik insecure API (S4) |
| P2-2 | Fix the rate limit if A1 failed; refuse to start without `JWT_SECRET` (A3); invalidate tokens of deactivated users (A4). Each as its own small commit with a test |
| P2-3 | Worker shared-secret header and disabling `workers.dev` (S11); put the Worker source in the repository |
| P2-4 | CSP pass (A5) in a branch with browser testing |
| P2-5 | Name owners: server account `admlocal`, Cloudflare account/domain, Microsoft account behind the tunnel. Fill the handover sheet ([ACCESS](ACCESS.md)) and give a **second administrator** every access |
| P2-6 | Quarterly drill: restore a backup into a scratch database; stop the tunnel and watch the alert and the heal; read the report of `scripts/server-audit/collect.sh` |

### Phase 3: structural (weeks, depends on P0-5 and P1-6)

Switch to `cloudflared` (option 2) if QUIC works or IT opens 7844; otherwise pursue the IT inbound path (option 3).
For option 2: create a named tunnel in the Cloudflare account that owns `deii-salas.uk`, route `deii-salas.uk` to
`http://127.0.0.1:80` with the Traefik host rule `deii-salas.uk` (already defined), run it as a systemd service with
a **tunnel token** (no personal login), keep the Dev Tunnel unit disabled but documented, test from outside, then remove
the Worker. The watchdog and the external monitor stay: they apply to any tunnel.

### Targets once Phase 1 is done

| Measure | Target |
| ------- | ------ |
| Time to detect a public outage | under 5 min (external monitor) |
| Time to recover the known tunnel failure without a person | under 6 min (watchdog) |
| Time to recover from a server reboot | under 5 min, unattended |
| Data you could lose | at most 24 h (nightly backup); restore tested |
| People who can restore service | at least 2, with their own named accounts |

## 6. The database reset you chose (Option A) in this order

Option A deletes **everything** (users, rooms, holidays, semester dates, contacts, reservations, history, email log)
and reloads the seed. Production today holds 8 users, 16 reservations (2026-09-21 to 2026-12-04), 7 calendar dates,
43 history entries, 31 email-log rows. Do it in one window, outside working hours:

1. **Back up first** (irreversible otherwise): *Administración › Respaldos* **and** the `pg_dump` command in the
   [RUNBOOK](RUNBOOK.md#backup-the-database); copy the file **off the server** and check it is not empty. The only
   backup that exists today is 26 KB from 2026-09-24.
2. **Generate the private admin password statement** on your computer (nothing is sent anywhere):
   ```bash
   node scripts/import-sessions/admin_password_sql.js julieta.esquinca@ibero.mx \
     > scripts/import-sessions/private/admin_password.sql
   ```
   It asks twice without echo, enforces the application's password rule and writes only a bcrypt hash (the folder is
   git-ignored). It needs Node and `bcryptjs` (`cd backend && npm ci` once, or run it inside the backend container).
3. **Reset** with [DEPLOYMENT §4](DEPLOYMENT.md#4-database-initialization) (drop schema, load `schema.sql` and
   `seed.sql`), **then immediately** apply the admin password file, **before** the API is redeployed and before anyone
   can log in:
   ```bash
   scp -J <user>@antares.dci.uia.mx scripts/import-sessions/private/admin_password.sql <user>@<server-ip>:~/
   sudo docker exec -i $(sudo docker ps -qf "name=iberoreservationsdb") \
     sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ~/admin_password.sql
   shred -u ~/admin_password.sql
   ```
   Expected output: `administradores_actualizados | 1`. This closes finding A2: the public default password is
   never usable.
4. **Redeploy the API** in Dokploy so migrations 001-009 run on the fresh schema; check `[Migrate] Applied 009_rooms.sql`
   and `curl -s https://deii-salas.uk/api/health`.
5. Log in as the administrator with the **private** password; set the **real calendar** (festivos, cierres, semester
   dates) and create the secretary accounts (*Administración*).
6. Generate and apply `import.sql` ([DATA_MIGRATION §4-6](DATA_MIGRATION.md)); verify with section 6 of that document.
7. Delete the copies of personal files from the server (`shred -u`) and record the date in
   [DEPLOYMENT](DEPLOYMENT.md#change-history).

Do this **after** P1-3 (a nightly backup exists) if you can; at minimum do step 1 by hand.

## 7. Open items that need a decision from a person

1. Who receives the alerts (two names and a second channel).
2. Who will be the second administrator of the server, of Cloudflare and of the Microsoft account.
3. Whether IT can open outbound UDP/TCP 7844 or provide an inbound path (decides option 2 or 3).
4. Where off-server backups are stored.
5. Whether the person who deployed on 2026-10-06 is the regular deployer.
