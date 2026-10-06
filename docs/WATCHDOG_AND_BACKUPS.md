# Watchdog, alerts and backups: administrator guide

For whoever administers the server `reservadeii`. Installed on **2026-10-06**; it changes nothing in the application,
Docker/Swarm, Dokploy, Traefik, the tunnel's own unit, the Worker or Cloudflare. Design and reasoning:
[PLAN_AVAILABILITY_AND_SECURITY](PLAN_AVAILABILITY_AND_SECURITY.md). Source: [`infra/`](../infra/).

Commands marked **[sudo]** need the administrator's password, typed by that person.

## 1. What runs on the server

| Piece | What it does | When |
| ----- | ------------ | ---- |
| **Tunnel watchdog** (`devtunnel-watchdog.timer`) | Calls the public tunnel's `/api/health`. After 2 failures in a row, if the app is healthy locally, restarts `devtunnel-reservations` (at most every 10 min). E-mails when the site is back, when restarts do not help, or when the application itself is down | Every 2 minutes (first run 3 min after boot) |
| **Alert mailer** (`devtunnel-notify.sh`) | Sends the e-mails through the SMTP account the API container already holds; no password is stored on the host | On demand, called by the watchdog and the backup |
| **Nightly backup** (`ibero-db-backup.timer`) | `pg_dump` compressed to `/var/backups/ibero/`, verified, 14 days kept, e-mail if it fails | 02:00 UTC (20:00 Mexico City) |
| **Settings file** `/etc/default/ibero-alerts` | Recipients and optional heartbeat | Read at every run |

Files: `/usr/local/sbin/{devtunnel-watchdog,devtunnel-notify,db-backup}.sh`,
`/etc/systemd/system/{devtunnel-watchdog,ibero-db-backup}.{service,timer}`, `/etc/default/ibero-alerts`.
Short-term memory of the watchdog (counters, last restart, last alert): `/run/devtunnel-watchdog.*`.
Not covered (still needs a person): an expired Microsoft login, a dead server, network, Cloudflare Worker or domain.
That is what the **external monitor** is for ([setup guide](EXTERNAL_MONITOR.md)).

## 2. Settings

### 2.1 Who receives the e-mails (the one you will change most)

```bash
sudo nano /etc/default/ibero-alerts
```

```
ALERT_TO=p18731@correo.uia.mx,a231592a@correo.uia.mx      # comma separated, no spaces, no quotes
#HEARTBEAT_URL=https://hc-ping.com/<uuid>                       # optional dead-man's-switch ping
```

Nothing to restart: the next run reads it. Check it:

```bash
sudo /usr/local/sbin/devtunnel-notify.sh "[IberoReservas] TEST" "Test after changing recipients"
```

The **external monitor** has its own recipient list in that service's dashboard; change both when people change.
If the file is deleted the scripts fall back to the two original addresses.

### 2.2 Tuning (rarely needed)

Set with `sudo systemctl edit devtunnel-watchdog.service` and add lines like `[Service]` / `Environment=THRESHOLD=3`,
then `sudo systemctl daemon-reload`.

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `WATCHDOG_URL`, `TUNNEL_HOST` | `https://npbkpmwc-80.usw3.devtunnels.ms/api/health`, `npbkpmwc-80.usw3.devtunnels.ms` | **Change both if the tunnel host ever changes** (new tunnel under another account). A wrong host makes the watchdog restart the tunnel every 10 minutes for nothing |
| `THRESHOLD` | 2 | Consecutive failed checks before acting |
| `MIN_INTERVAL` | 600 | Seconds between restarts |
| `ESCALATE_AFTER` | 2 | Restarts that did not help before the "ACTION NEEDED" mail |
| `ALERT_EVERY` | 3600 | Minimum seconds between repeated alerts |
| Backup: `KEEP_DAYS`, `BACKUP_DIR` | 14, `/var/backups/ibero` | Retention and folder (`sudo systemctl edit ibero-db-backup.service`) |

## 3. The e-mails and what to do

| Subject starts with | Meaning | Action |
| ------------------- | ------- | ------ |
| `[IberoReservas] RECOVERED` | Site back; says how long and how many restarts | None. If it happens every few days, tell the project owner |
| `[IberoReservas] ACTION NEEDED` | Automatic restarts did not help, usually the Microsoft login expired | As the tunnel account holder: `sudo -u acardena -H /home/acardena/bin/devtunnel user login -d` (device-code login), then `sudo systemctl restart devtunnel-reservations`. Check `curl -s https://deii-salas.uk/api/health` |
| `[IberoReservas] ALERT: the application is down` | Tunnel fine, API/Traefik/DB is not (the watchdog does not restart the tunnel) | `sudo docker service ls`, `sudo docker service logs --tail 50 <api service>`; see [RUNBOOK](RUNBOOK.md) |
| `[IberoReservas] ALERT: nightly database backup FAILED` | Last night's dump did not complete | `journalctl -t ibero-db-backup --since '2 days ago'`; run `sudo /usr/local/sbin/db-backup.sh` by hand |
| `[IberoReservas] TEST` | A manual test | None |

## 4. Everyday commands

```bash
# Is everything on?
systemctl list-timers devtunnel-watchdog.timer ibero-db-backup.timer --no-pager
systemctl is-active devtunnel-reservations devtunnel-watchdog.timer ibero-db-backup.timer
/home/acardena/bin/devtunnel show ibero-reservas.usw3 | grep -E 'Host connections|Expiration'      # Host connections must be 1
curl -s https://deii-salas.uk/api/health                                                           # {"ok":true,...}

# What did the watchdog decide? (journal needs sudo or the adm group)
sudo journalctl -t devtunnel-watchdog --since '1 day ago' --no-pager
sudo journalctl -t devtunnel-watchdog -f                    # live

# Run a check right now (no output = healthy)                      [sudo]
sudo /usr/local/sbin/devtunnel-watchdog.sh

# Pause the watchdog (for example during a planned tunnel change)  [sudo]; ALWAYS enable it again
sudo systemctl stop devtunnel-watchdog.timer
sudo systemctl start devtunnel-watchdog.timer

# Send a test e-mail                                               [sudo]
sudo /usr/local/sbin/devtunnel-notify.sh "[IberoReservas] TEST" "Hello"
```

### Failure drill (about 4 minutes of downtime; do it outside school hours)

```bash
sudo systemctl kill -s STOP devtunnel-reservations          # process alive but not answering = the real failure
sudo journalctl -t devtunnel-watchdog -f                     # expect: 2 failed checks, "restarting", then "recovered"
```

Expected (measured 2026-10-06): site down about 3.5 min, restarted by itself, a `RECOVERED` e-mail to both people about
2 minutes after recovery. Abort: `sudo systemctl kill -s CONT devtunnel-reservations`.

### Backups

```bash
sudo ls -lh /var/backups/ibero/                              # one file per night, 14 kept
sudo /usr/local/sbin/db-backup.sh                            # take one now
journalctl -t ibero-db-backup --since '7 days ago'           # history (add sudo if needed)
# copy one off the server: first make it readable, then fetch it from your computer
sudo cp /var/backups/ibero/<file>.sql.gz ~ && sudo chown acardena ~/<file>.sql.gz
scp -J <user>@antares.dci.uia.mx <user>@<server-ip>:<file>.sql.gz .
# restore (overwrites current data; take a fresh backup first; then restart the API)
zcat /var/backups/ibero/<file>.sql.gz | sudo docker exec -i $(sudo docker ps -qf name=iberoreservationsdb) sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

The backups sit **on the same disk** as the database. Copying them somewhere else is still an open decision
([plan, section 8](PLAN_AVAILABILITY_AND_SECURITY.md)); until then copy the newest one by hand now and then.

## 5. Reinstall or remove

From the repository's `infra/` folder (copy it to the server first, `scp -r`):

```bash
cd ~/ibero-infra && sudo bash install-on-server.sh          # safe to repeat; never overwrites /etc/default/ibero-alerts
```

Remove everything this guide describes:

```bash
sudo systemctl disable --now devtunnel-watchdog.timer ibero-db-backup.timer
sudo rm /etc/systemd/system/{devtunnel-watchdog,ibero-db-backup}.{service,timer}
sudo rm /usr/local/sbin/{devtunnel-watchdog,devtunnel-notify,db-backup}.sh
sudo systemctl daemon-reload                                 # keep /etc/default/ibero-alerts and /var/backups/ibero unless you want them gone
```

## 6. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| No e-mails arrive | SMTP of the application is broken, or the API container is down | Test in the app (*Administración › Notificaciones*); `sudo /usr/local/sbin/devtunnel-notify.sh ...` prints why. The external monitor still alerts |
| `notify: API container not running` in the journal | The API is down | Treat as an application outage ([RUNBOOK](RUNBOOK.md)) |
| Tunnel restarted every 10 min, never recovers | Wrong `TUNNEL_HOST`/`WATCHDOG_URL`, or the Microsoft login expired | Compare with `devtunnel show ibero-reservas.usw3`; do the login step in section 3 |
| Timer shows `n/a` for next run | Timer stopped | `sudo systemctl start devtunnel-watchdog.timer` |
| Backup file tiny or missing | Database container name changed, or the dump failed | `journalctl -t ibero-db-backup`; check `docker ps` for `iberoreservationsdb` |
| Disk filling | Backups plus Docker logs | `df -h /`; shorten `KEEP_DAYS`; see the Docker log rotation item in the plan |

## 7. One-time data migration commands (clean-up and import)

Used once for the professor's reservations ([DATA_MIGRATION](DATA_MIGRATION.md)). Files are placed on the server in
a private folder; the script does a backup first and stops on any error.

```bash
mkdir -m 700 ~/ibero-migration                               # then scp migrate.sh, cleanup_keep_calendar.sql, import.sql into it
cd ~/ibero-migration
sudo bash migrate.sh preview     # read-only: rooms, calendar, users; shows what the clean-up WOULD delete, then rolls back
sudo bash migrate.sh apply       # backup -> clean-up (only the administrator, calendar kept) -> import -> verification
sudo bash migrate.sh verify      # only the verification queries
shred -u import.sql cleanup_keep_calendar.sql                # afterwards: they hold personal data
```

`KEEP_EMAILS=a@x,b@y` keeps more than one administrator (default: `julieta.esquinca@ibero.mx`). The script refuses to
run without both SQL files and aborts if the backup fails.

### 7.1 Inviting the imported people

```bash
API=$(sudo docker ps -qf "name=reservationsapi")
sudo docker exec $API node scripts/send_migration_welcome.js          # dry run: who gets what
sudo docker exec $API node scripts/send_migration_welcome.js --send   # one e-mail each: account + create-password link + reservations
```

Details and reasoning: [DATA_MIGRATION §4b](DATA_MIGRATION.md#4b-inviting-the-imported-people-one-e-mail-each). Needs the API image with the script deployed.
