# tunnel-watchdog

Heals the Dev Tunnel when it is **silently disconnected** and e-mails the people on call. It does not change the
architecture: same tunnel, same Worker, same Traefik. It only adds a timer on the server. **Not installed yet**
(needs `sudo`); installation steps below.

**Problem.** `devtunnel host` can stay "running" while disconnected (log: *Not authorized, refreshed tunnel access
token is not valid*), so systemd's `Restart=always` never restarts it. It happened on 2026-09-29 (about 29 h down) and
2026-10-02 (about 91 h); see [RUNBOOK](../../docs/RUNBOOK.md#tunnel-process-running-but-site-down).

## What it does (every 2 minutes, systemd timer)

```
GET https://npbkpmwc-80.usw3.devtunnels.ms/api/health        (the public tunnel path)
├─ 200 ............ healthy. If an outage was open: e-mail "RECOVERED"; clear state; stop
└─ fails .......... count it; below 2 failures in a row: stop (ignore blips)
     ask Traefik locally (curl -H "Host: <tunnel host>" http://127.0.0.1/api/health)
     ├─ app fails ... not the tunnel: do NOT restart; e-mail "application is down" (max 1 per hour)
     └─ app ok ...... restart devtunnel-reservations, at most once every 10 min
                      2 restarts and still down: e-mail "ACTION NEEDED" with the login fix (max 1 per hour)
```

| E-mail subject starts with | When | What the reader must do |
| -------------------------- | ---- | ----------------------- |
| `[IberoReservas] RECOVERED` | The site came back (says how long and how many restarts) | Nothing |
| `[IberoReservas] ACTION NEEDED` | Automatic restarts did not help (usually the Microsoft login expired) | `devtunnel user login -d` as `acardena`, restart the unit (the mail has the commands) |
| `[IberoReservas] ALERT: the application is down` | The tunnel is fine but the API/Traefik/DB is not | Look at the Swarm services (the mail has the commands) |

**Recipients:** `antonio.cardena@ibero.mx` and `a231592a@correo.uia.mx`, set in **one file on the server**, `/etc/default/ibero-alerts` (see [Where to change the e-mails](#where-to-change-the-e-mails)).

**How the e-mail is sent.** `devtunnel-notify.sh` runs a small `nodemailer` call **inside the API container**, which
already holds the SMTP settings. Nothing secret is copied to the host or stored by the watchdog, and nothing is
written to the application's `notification_logs`. If the API container is down it cannot send; that case is covered by
the **external uptime monitor** (which does not depend on this server). Check that the app's SMTP works first
(*Administración › Notificaciones › Enviar correo de prueba*, [SMTP guide](../../docs/SMTP_ADMIN_GUIDE.md)): the audit
showed both `sent` and `failed` rows in the email log.

**What it cannot do.** Renew an expired Microsoft login (a person must), see a dead server/network/Cloudflare
(use the external monitor), or extend the tunnel's expiry. Every decision is written to the journal:
`journalctl -t devtunnel-watchdog`.

## What is installed on the server

| Path | What it is |
| ---- | ---------- |
| `/usr/local/sbin/devtunnel-watchdog.sh` | The watchdog (the logic above) |
| `/usr/local/sbin/devtunnel-notify.sh` | Sends an e-mail through the API container's SMTP account |
| `/etc/systemd/system/devtunnel-watchdog.service` and `.timer` | Runs the watchdog 3 min after boot and then every 2 min, as root |
| `/etc/default/ibero-alerts` | **Settings you may edit**: recipients and optional heartbeat URL |
| `/run/devtunnel-watchdog.*` | Its short-term memory (failure counters, last restart, last alert); resets at reboot |
| Journal | `journalctl -t devtunnel-watchdog` (needs `sudo` or the `adm` group) |

It does **not** change the application, Docker/Swarm, Dokploy, Traefik, the tunnel's own unit, the Worker or Cloudflare.
The nightly backup ([`../db-backup/`](../db-backup/README.md)) shares the same recipients file.

## Where to change the e-mails

Edit **one file** on the server:

```bash
sudo nano /etc/default/ibero-alerts        # change the ALERT_TO line: addresses separated by commas, no spaces
sudo /usr/local/sbin/devtunnel-notify.sh "[IberoReservas] TEST" "Test after changing recipients"   # optional check
```

No restart is needed: the next run reads the file. The same file sets `HEARTBEAT_URL` (uncomment and paste the
Healthchecks.io ping URL). If the file is deleted the scripts fall back to the two original addresses. Remember the
**external monitor's** recipients are separate: change them in that service's dashboard.

In the repository the template is [`../ibero-alerts.default`](../ibero-alerts.default); the installer creates the
server file only if it does not exist, so re-running the installer never overwrites your edits.

## Tests (no server needed)

```bash
docker run --rm -v "$PWD":/w:ro -v "$PWD/tests/run.sh":/t.sh:ro ubuntu:24.04 bash /t.sh     # 15 checks: healthy, 1/2 failures, restart, throttle, escalation, repeat limit, recovery, app down
```

## Install (needs `sudo`, in a quiet moment; read the files first)

From the repository folder `infra/tunnel-watchdog/` (copy it to the server with `scp -J` first):

```bash
# 0. Confirm the tunnel host the script should check (must be the CURRENT one)
sudo -u acardena /home/acardena/bin/devtunnel show ibero-reservas.usw3 | grep -i 'https://'      # expect npbkpmwc-80.usw3.devtunnels.ms
# 1. Install
sudo install -m 0755 devtunnel-watchdog.sh /usr/local/sbin/devtunnel-watchdog.sh
sudo install -m 0755 devtunnel-notify.sh   /usr/local/sbin/devtunnel-notify.sh
sudo install -m 0644 devtunnel-watchdog.service /etc/systemd/system/devtunnel-watchdog.service
sudo install -m 0644 devtunnel-watchdog.timer   /etc/systemd/system/devtunnel-watchdog.timer
# 2. Test the e-mail path on its own (both people should receive it)
sudo /usr/local/sbin/devtunnel-notify.sh "[IberoReservas] TEST" "Test of the watchdog e-mail. No action needed."
# 3. Run the check once by hand (no output = healthy)
sudo /usr/local/sbin/devtunnel-watchdog.sh
# 4. Enable
sudo systemctl daemon-reload
sudo systemctl enable --now devtunnel-watchdog.timer
systemctl list-timers devtunnel-watchdog.timer
```

If step 2 prints `e-mail NOT sent`, fix SMTP first (the line says why); the rest still works and the external monitor
remains the alert channel.

### Acceptance test of the whole chain (about 10 minutes, outside working hours, tell the team)

```bash
sudo systemctl kill -s STOP devtunnel-reservations          # process alive but not answering = the real failure
journalctl -t devtunnel-watchdog -f                          # expect 2 failures, then "restarting devtunnel-reservations"
```

A stopped process only dies after systemd's stop timeout (90 s), so expect the restart in about 6 minutes and then a
`RECOVERED` e-mail to both people, and an alert from the external monitor. Check `curl -s https://deii-salas.uk/api/health`.
To abort: `sudo systemctl kill -s CONT devtunnel-reservations`.

## Configure

Recipients and heartbeat: `/etc/default/ibero-alerts` (above). The rest are `Environment=` lines in the service file
(`sudo systemctl edit devtunnel-watchdog.service`, then `sudo systemctl daemon-reload`): `WATCHDOG_URL` and `TUNNEL_HOST`
(if the tunnel host ever changes), `THRESHOLD` (2), `MIN_INTERVAL` (600 s), `ESCALATE_AFTER` (2), `ALERT_EVERY` (3600 s).

## Remove

```bash
sudo systemctl disable --now devtunnel-watchdog.timer
sudo rm /etc/systemd/system/devtunnel-watchdog.{service,timer} /usr/local/sbin/devtunnel-{watchdog,notify}.sh   # keep /etc/default/ibero-alerts if the backup stays
sudo systemctl daemon-reload
```
