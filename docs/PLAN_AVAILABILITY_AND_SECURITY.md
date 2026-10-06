# Plan: keep the site online, detect failures, harden security

Status: **approved scope, not yet applied to the server.** Written 2026-10-06 from the read-only audit of the same day
([SERVER_CONFIGURATION](SERVER_CONFIGURATION.md)), the incident history in [DEPLOYMENT](DEPLOYMENT.md) and a review of
the API code.

## 0. Decisions that frame this plan

| Decision | Consequence |
| -------- | ----------- |
| **The architecture does not change.** Browser, Cloudflare Worker, Microsoft Dev Tunnel, Traefik, API, PostgreSQL stay as they are | Every item below is an addition (a timer, an alert, a backup, a setting) or a hygiene fix. Nothing replaces a component |
| `cloudflared` is **not an option**: the university blocks TCP 7844 ([ADR 0003](adr/0003-institutional-network-egress-restrictions.md)) | The structural alternatives that were discussed (Cloudflare Tunnel, a campus inbound path, other hosting) are **out of scope** |
| Alert recipients: **p18731@correo.uia.mx** (the account that owns the tunnel and Cloudflare) and **a231592a@correo.uia.mx** | The same two people receive the watchdog e-mails and the **external monitor's** alerts |
| The 2026-10-06 deploy of `74efe0c` was **made by the project owner** | Recorded in [DEPLOYMENT](DEPLOYMENT.md#change-history); no further action |
| **Database: not a full reset.** Keep the calendar; leave **only one administrator** (`julieta.esquinca@ibero.mx`), like the seed, then run the migration | Cleanup **Option C** ([section 7](#7-database-cleanup-and-migration-in-order)); the second super administrator is removed |
| Accounts: the **Microsoft login of the tunnel and the Cloudflare account are both `p18731@correo.uia.mx`** (one owner for both); the **Dokploy** panel is used with the account `antonio.cardena@ibero.mx` | A continuity risk handled in [section 4](#4-people-and-continuity-the-two-single-owners); recorded in [ACCESS](ACCESS.md) (no passwords there) |

## 1. Why the site goes down

```
browser > Cloudflare (DNS + Worker) > Microsoft Dev Tunnel relay > devtunnel process on the server > Traefik > web / API > PostgreSQL
            [1]                          [2]                         [3]                               [4]     [5]
```

| # | Link | How it fails | Seen so far | Recovers alone? |
| - | ---- | ------------ | ----------- | --------------- |
| 1 | Cloudflare Worker / domain | Worker points to a tunnel URL that changed; domain not renewed; account access lost | Only when the tunnel was recreated (2026-09-21) | No |
| 2 | Dev Tunnel service | Tunnel expired, Microsoft outage, account disabled | No | No |
| 3 | `devtunnel host` process | **Alive but disconnected** ("Not authorized ... refreshed tunnel access token is not valid"). systemd sees a running process and never restarts it | **2026-09-29 (~29 h) and 2026-10-02 (~91 h)** | **No** |
| 4 | Traefik / containers | Crash, bad deploy, full disk | No | Yes (Swarm restarts; failed deploys roll back) |
| 5 | Database | Disk, corruption | No | Restart yes; data only if backed up (**there is no automatic backup**) |

Both real outages were link 3, and a person noticed each, not a system. The plan has three jobs: **find out within
minutes**, **fix the known failure without a person**, and **make sure a second person can act**.

## 2. The watchdog, explained

`devtunnel-reservations.service` has `Restart=always`, which only helps when the process **exits**. In the outages the
process kept running with a dead connection, so the service looked healthy for days.

[`infra/tunnel-watchdog/`](../infra/tunnel-watchdog/README.md) adds an independent check, every 2 minutes, from a
systemd timer. It calls the public tunnel URL's `/api/health`. After **2 failures in a row** it asks Traefik locally;
if the application is healthy it restarts **only** `devtunnel-reservations` (at most once per 10 minutes). The time from
"tunnel silently dead" to "restarted" drops from days to about **4-6 minutes**.

It also **e-mails both people**:

| E-mail | When |
| ------ | ---- |
| `RECOVERED` | The site is back; says how long it was down and how many restarts it took |
| `ACTION NEEDED` | 2 automatic restarts did not help: almost always the Microsoft login expired. The mail contains the exact commands (`devtunnel user login -d` as `acardena`, then restart). Repeats at most once an hour |
| `ALERT: the application is down` | The tunnel is fine but the API/Traefik/DB is not, so it deliberately does **not** restart the tunnel. At most once an hour |

The e-mail is sent through the SMTP account the application already uses, from inside the API container, so no
password is copied to the host. Decision logic is covered by 15 automated checks (mocked `curl`/`systemctl`/mail) and
the mail path was tested with a mocked `docker`; both pass.

**Limits (so nobody over-trusts it):**

1. It cannot renew an expired Microsoft login: a person must run the login command (the `ACTION NEEDED` mail says so).
2. It runs on the server, so it cannot see a dead server, network, power, domain or Worker. Only the **external monitor** sees that.
3. If the API container is down it cannot send mail (that case is the external monitor's job).
4. The app's SMTP must work. The audit found both `sent` and `failed` rows in the email log: test it
   (*Administración › Notificaciones › Enviar correo de prueba*) before relying on it.
5. It does not extend the tunnel's lifetime; see the note in section 5, P0-1.

## 3. Layers

| Layer | Purpose | What |
| ----- | ------- | ---- |
| A. External monitor | Know in 1-5 min, **from outside**, that users cannot reach the site; catches Worker, domain, whole-server and network failures | A free HTTP monitor (UptimeRobot, Better Stack or similar) on `https://deii-salas.uk/api/health`, keyword `"ok":true`, alert contacts = the two e-mails (plus a phone/Teams channel if available) |
| B. Self-healing + mail | Fix the known failure and tell people | The watchdog above |
| C. Heartbeat (optional) | Detect "the server cannot reach the internet at all" | `HEARTBEAT_URL` in the watchdog pings a dead-man's-switch service after each healthy run; silence alerts |
| D. Safe changes | Avoid self-made outages | `start-first` rolling updates with rollback (already configured); smoke test after each deploy; no deploys in school hours |
| E. Recoverability | Come back from a bad day | Nightly `pg_dump`, 14 days, copied **off** the server; restore rehearsed monthly |
| F. People | A second person can act | Section 4 |

## 4. People and continuity: the two single owners

Cloudflare (the Worker and `deii-salas.uk`) and the Microsoft account behind the tunnel are **the same account,
`p18731@correo.uia.mx`, with one administrator, and there is no second person available** (decision of 2026-10-06). That is an
**accepted risk**: if that person or account is unavailable, nobody can fix the Worker, renew the tunnel login or change the tunnel.
It also means one lost account takes out both. What reduces it without changing the architecture:

| Risk | Mitigation |
| ---- | ---------- |
| **One account for Cloudflare and the tunnel** (`p18731@correo.uia.mx`) | Two-step verification **with the recovery codes stored in the team password manager** (not on one phone); a recovery e-mail/phone on the account; the credentials in the handover sheet ([ACCESS](ACCESS.md)), delivered through the sealed/offline channel; the Worker source is in [DEPLOYMENT §5](DEPLOYMENT.md) so it can be recreated; note the domain **registrar** and renewal date (not yet known) |
| **Tunnel login expiring** | That account is also an alert recipient, so the `ACTION NEEDED` e-mail reaches the person who can approve the device-code login. If that person is unreachable, `a231592a@correo.uia.mx` cannot act alone: rehearse once the documented "new tunnel under another account" procedure ([RUNBOOK](RUNBOOK.md#change-the-account-that-owns-the-dev-tunnel)) so it is known to work |
| **Dokploy panel** is used with the account `antonio.cardena@ibero.mx` | One named person; its password is temporary and must be changed at first use; never recorded in the repository |
| Server access by **named people**: `admlocal` has no owner | Assign or lock it; one account per person |

If either account's holder leaves the university, that is a **hand-over event**: do the change-of-owner steps in the
RUNBOOK *before* the account is disabled.

## 5. Phased implementation plan

Order matters: observe first, then change one thing at a time, each with a test and a way back. **[sudo]** = needs the
server administrator's password, typed by that person.

### Phase 0: now, no server changes (about 1 hour)

| # | Action | Done when |
| - | ------ | --------- |
| P0-1 | **Record the tunnel's expiry.** As `acardena`: `/home/acardena/bin/devtunnel show ibero-reservas.usw3`, read *Expiration*. Per Microsoft's documentation it is a **sliding inactivity window** (renewed by activity), so a tunnel that is hosted and used should not expire; an earlier draft of this plan feared a hard expiry on 2026-10-21, and that is **not** supported by the documentation. Write the value in the RUNBOOK and extend it if it is short ([RUNBOOK](RUNBOOK.md#check-and-extend-the-tunnel-expiry)) | Value recorded |
| P0-2 | **Done 2026-10-06** (UptimeRobot, signs in with `p18731@correo.uia.mx`, which is its only alert contact; see [EXTERNAL_MONITOR](EXTERNAL_MONITOR.md)). Original step: **Create the external monitor** (layer A; step by step: [EXTERNAL_MONITOR](EXTERNAL_MONITOR.md)). Recommended: **UptimeRobot** (free, 5-minute checks, keyword check, e-mail alerts; its free plan is for non-commercial use, otherwise use Better Stack's free tier) on `https://deii-salas.uk/api/health`, keyword `"ok":true`, alert contacts `p18731@correo.uia.mx` and `a231592a@correo.uia.mx`. Optional, for a server/network outage: **Healthchecks.io** (free, 20 checks), give its ping URL to the watchdog as `HEARTBEAT_URL`. The accounts are created and the terms accepted by whoever will administer them | A test alert arrives at both |
| P0-3 | **Test the app's SMTP** (*Notificaciones › Enviar correo de prueba*) to both addresses | Both receive it; if not, fix SMTP first ([SMTP guide](SMTP_ADMIN_GUIDE.md)) |
| P0-4 | **Run the login rate-limit test** with a phone on mobile data ([RUNBOOK](RUNBOOK.md#verify-the-login-rate-limit-shared-by-everyone-or-per-client)) | Result written down (decides P2-2) |
| P0-5 | Cloudflare administrator: enable two-step verification and store the recovery codes in the team password manager; Microsoft account owner: add a recovery contact (section 4) | Both done |

### Phase 1: this week, maintenance window (**[sudo]**, about half a day)

| # | Action | Test | Back out |
| - | ------ | ---- | -------- |
| P1-1 | [**Done 2026-10-06** (`/var/backups/ibero`, plus the earlier file from 2026-09-24).] **Backup now, by hand** (before anything else): *Administración › Respaldos* and the `pg_dump` in the [RUNBOOK](RUNBOOK.md#backup-the-database); copy it off the server | File is not empty (`ls -l`); can be read | n/a |
| P1-2 | [**Installed 2026-10-06** by `infra/install-on-server.sh`; TEST e-mail accepted by SMTP for both recipients (confirm they arrived).] **Install the watchdog** exactly as in the [README](../infra/tunnel-watchdog/README.md): confirm the tunnel host, install four files, send the TEST mail, run once by hand, enable the timer | Both people receive the TEST mail; `systemctl list-timers` shows the timer | `systemctl disable --now devtunnel-watchdog.timer` |
| P1-3 | [**Done 2026-10-06, passed.** The tunnel process was frozen at 06:36:52 UTC; the public site was down until 06:40:17 (about 3.5 min); the journal shows 2 failed checks, the app-healthy check, the restart, and then the RECOVERED e-mail to both people (sent 2 min after recovery, as designed).] **Acceptance test of the chain** (README section): `systemctl kill -s STOP devtunnel-reservations`, watch the journal | Restart in about 6 min; `RECOVERED` mail to both; external monitor alert too | `kill -s CONT` |
| P1-4 | [**Installed 2026-10-06** (timer 02:00 UTC; first run created a verified 9.7 KB file). Off-server copy still open.] **Nightly backups**: a systemd timer (02:00) running the documented dump, kept 14 days in `/var/backups/ibero/` (mode 600), newest copy pushed off the server; alert if the last one is older than 26 h | A scratch-database restore of last night's file works | Disable the timer |
| P1-5 | **Updates and a reboot** (38 packages, a restart is pending, up 18 days). Then confirm everything **returns unattended**: Docker, Swarm services, Traefik, `devtunnel-reservations`, the watchdog timer | Site answers within 5 min after the reboot with nobody logged in | Boot the previous kernel from GRUB |
| P1-6 | **Docker log rotation** (`/etc/docker/daemon.json`: `json-file`, `max-size 10m`, `max-file 3`), at the same reboot | `docker info`; disk under 80% | Remove the file |
| P1-7 | **Close the Dokploy panel (port 3000) to the network** (S2; files and test in [`infra/firewall/`](../infra/firewall/README.md)). Keep using it through the SSH tunnel you already use (`-L 3000:127.0.0.1:3000`). Docker-published ports bypass UFW, and Dokploy is a Swarm service published in `host` mode, which **cannot be bound to 127.0.0.1**; so the control that works is a `DOCKER-USER` iptables rule that drops port 3000 unless the source is the server itself (made persistent across reboots), plus removing the UFW rule. Test it before closing your session | From another campus host, `curl -m 5 http://<server>:3000` times out; the panel still works through the SSH tunnel | `ufw allow 3000/tcp` |
| P1-8 | **SSH hardening** (S1), **after** keys exist for each administrator, with your current session left open: `PasswordAuthentication no`, `PermitRootLogin no`, `X11Forwarding no`, `MaxAuthTries 3` in a `/etc/ssh/sshd_config.d/` drop-in; `sshd -t`; reload; test a **new** login before closing the first | Key login works, password login refused | Edit the drop-in back from the open session |

### Phase 2: next weeks (no downtime, done through Dokploy / code)

| # | Action |
| - | ------ |
| P2-1 | Delete the dead Traefik routes (`localhost`, `reservas.local`, `dokploy.docker.localhost`, the retired tunnel host `5x0zgl8x-80...`) and set a real ACME contact (S4, S5, S12); turn off Traefik's insecure API |
| P2-2 | If P0-4 shows a shared or bypassable rate limit, key it on the real client IP (A1). Refuse to start in production without a strong `JWT_SECRET` (A3). Reject tokens of deactivated users (A4). Each a small commit with a test |
| P2-3 | A content-security-policy pass (A5), in a branch with browser testing |
| P2-4 | Name owners for `admlocal`, the domain registrar and renewal, and the SMTP mailbox; fill the handover sheet |
| P2-5 | Quarterly drill: restore a backup into a scratch database; stop the tunnel and watch alert and heal; run `scripts/server-audit/collect.sh` and compare |

**Deferred (they touch how traffic flows, so they wait until you decide):** restricting ports 80/443 to the server itself
(S3), the Worker shared-secret header and disabling the `workers.dev` route (S11). They do not change the architecture's
components, but they alter the path, so they are listed as options only.

### Targets once Phase 1 is done

| Measure | Target |
| ------- | ------ |
| Detect a public outage | under 5 min (external monitor + mail) |
| Recover the known tunnel failure with no person | under 6 min |
| Recover from a server reboot | under 5 min, unattended |
| Data you could lose | at most 24 h; restore tested |
| People able to act | the two alert recipients, with the owner reachable for the Microsoft login |

## 6. Security review

Evidence: the audit of 2026-10-06 and the code in `backend/`. **Verify** = could not be proven from here; a test is attached.

### Server and network

| ID | Finding | Severity | Fix (phase) |
| -- | ------- | -------- | ----------- |
| S1 | **SSH accepts passwords**; root login allowed with keys; X11 forwarding on; no keys installed anywhere | High | Keys, then password login off (P1-8) |
| S2 | **Dokploy panel on port 3000 open to the whole network over plain HTTP**; it controls Docker (root-equivalent) | High | Close it, use the SSH tunnel (P1-7) |
| S3 | Ports 80/443 open to the network although the tunnel connects locally | Medium | Deferred (touches traffic path) |
| S4 | Traefik dashboard API `insecure: true` (port 8080 is not published, so not exposed today) | Low | P2-1 |
| S5 | Dead routes: `localhost`, `reservas.local`, `dokploy.docker.localhost`, retired tunnel host, direct `deii-salas.uk` | Low | P2-1 |
| S6 | 38 pending updates, reboot pending, not on Ubuntu Pro | Medium | P1-5 |
| S7 | Docker logs never rotated; 11 GB free of 29 GB | Medium | P1-6 |
| S8 | **No backups** (only a 26 KB dump from 2026-09-24) | **High** | P1-1, P1-4 |
| S9 | `admlocal` has no named owner; both administrators in `sudo`; tunnel login lives under `acardena` | Medium | P2-4, section 4 |
| S11 | Two public entry points: the Worker and the tunnel URL itself (anonymous connect) | Medium | Deferred |
| S12 | ACME contact is a placeholder; `acme.json` empty (TLS ends at Cloudflare/the tunnel) | Low | P2-1 |

### Application

| ID | Finding | Severity | Fix (phase) |
| -- | ------- | -------- | ----------- |
| A1 | Login rate limit may be **one shared bucket** (`trust proxy 1` behind four hops) or bypassable with a forged `X-Forwarded-For` | High, **verify** | P0-4 then P2-2 |
| A2 | The seed holds a real person's account with a **public default password** | High if still in use | Option C prints a warning if so; set a private password (section 7) |
| A3 | `JWT_SECRET` falls back to `dev_secret_key` if missing | Medium | P2-2 |
| A4 | 8 h bearer tokens, no revocation on deactivation | Low-Medium | P2-2 |
| A5 | No Content-Security-Policy | Medium | P2-3 |
| A6 | CORS limited to `APP_URL` when set | Low | Confirm `APP_URL=https://deii-salas.uk` |
| A7 | Secrets are plain environment variables of the API service | Low-Medium | Rotate on suspicion; never in the repo |
| A8 | Already good: helmet, 100 kb body cap, login rate limit, bcrypt, password rule, academic privacy (404 on others' reservations, anonymised busy slots), idempotent migrations | n/a | Keep |

## 7. Database cleanup and migration, in order

Choice: **Option C**, "only the administrator, calendar kept". Production today holds 8 users, 16 reservations, 7
calendar dates, 43 history entries and 31 email-log rows. Do it in one window outside working hours.

1. **Back up** (irreversible otherwise): *Administración › Respaldos* and the `pg_dump` in the
   [RUNBOOK](RUNBOOK.md#backup-the-database); copy it **off the server**; check it is not empty.
2. **Clean** with [`cleanup_keep_calendar.sql`](../scripts/import-sessions/cleanup_keep_calendar.sql)
   ([DATA_MIGRATION, Option C](DATA_MIGRATION.md#option-c-only-the-administrator-calendar-kept-chosen-for-production-2026-10-06)).
   It keeps the administrator, rooms, festivos/cierres, semester dates; deletes every other user, all reservations,
   series, requests, history, email log, external contacts. It **refuses to run** unless every email in `keep_emails` is an
   active administrator, shows exactly which accounts it will delete, and warns if the administrator still has the seed's
   public password. Rehearsed on a copy of a populated database.
   Production has *two* super administrators; by decision only one stays, so pass just
   `-v keep_emails=julieta.esquinca@ibero.mx` (the other account is deleted and shown in the list beforehand).
3. If the output says the public default password is in use, set a private one right away (*Usuarios › Editar*, or
   `scripts/import-sessions/admin_password_sql.js`).
4. Generate and apply `import.sql` ([DATA_MIGRATION §4, steps 5-6](DATA_MIGRATION.md#4-step-by-step-in-production)).
   It renames the room and creates the 4 people; check the room list printed by step 2 first.
5. **Verify** ([DATA_MIGRATION §6](DATA_MIGRATION.md#6-verification)): 45 reservations, 5 series, 4 academics; log in as
   one of them and see the rest as grey "Ocupado".
6. `shred -u` every personal file copied to the server, and record the date in [DEPLOYMENT](DEPLOYMENT.md#change-history).

## 8. Open items that need a person

1. Create the external monitor (and optionally the Healthchecks.io heartbeat) and send a test alert (P0-2).
2. Confirm that the TEST e-mail arrived at `p18731@correo.uia.mx` and `a231592a@correo.uia.mx` (also spam).
3. Go-ahead for the tunnel failure drill (P1-3) and, separately, for the database cleanup (section 7).
4. Which registrar holds `deii-salas.uk` and when does it renew?
5. Where do off-server copies of the backups go (today they stay on the server's disk)?
