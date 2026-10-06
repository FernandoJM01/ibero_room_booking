# tunnel-watchdog (proposal, NOT installed)

Restarts the `devtunnel-reservations` service when the Dev Tunnel is **silently disconnected**.

**Problem it addresses.** `devtunnel host` can stay "running" while disconnected (log: *Not authorized, refreshed
tunnel access token is not valid*), so systemd's `Restart=always` never restarts it. This happened on 2026-09-29
(about 29 h down) and on 2026-10-02 (about 91 h down); see
[RUNBOOK](../../docs/RUNBOOK.md#tunnel-process-running-but-site-down).

**What it does** (every 2 minutes, via a systemd timer):

1. Calls the tunnel's health URL. If it answers, it resets and stops.
2. After **2 consecutive failures**, checks the application locally through Traefik. If the app itself is down it does
   **nothing** (restarting the tunnel would not help; it logs why).
3. Otherwise restarts only `devtunnel-reservations`, **at most once every 10 minutes**.

Every decision is written to the journal (`journalctl -t devtunnel-watchdog`). The decision logic is tested with mocked
`curl` and `systemctl` (healthy, single failure, two failures, throttling, app down, recovery).

**What it does not do:** it cannot renew an expired Microsoft login. If the restart fails with *Not authorized* again, a
person must run `devtunnel user login -d` as `acardena` (see the RUNBOOK). It also does not alert anyone: add an external
uptime monitor on `https://deii-salas.uk/api/health` as well.

## Install (needs `sudo`; read the files first)

```bash
sudo install -m 0755 devtunnel-watchdog.sh /usr/local/sbin/devtunnel-watchdog.sh
sudo install -m 0644 devtunnel-watchdog.service /etc/systemd/system/devtunnel-watchdog.service
sudo install -m 0644 devtunnel-watchdog.timer   /etc/systemd/system/devtunnel-watchdog.timer
sudo /usr/local/sbin/devtunnel-watchdog.sh && echo "manual run OK (no output means healthy)"
sudo systemctl daemon-reload
sudo systemctl enable --now devtunnel-watchdog.timer
systemctl list-timers devtunnel-watchdog.timer
```

If the tunnel host ever changes, edit `Environment=WATCHDOG_URL=` and `TUNNEL_HOST=` in the service file.

## Remove

```bash
sudo systemctl disable --now devtunnel-watchdog.timer
sudo rm /etc/systemd/system/devtunnel-watchdog.{service,timer} /usr/local/sbin/devtunnel-watchdog.sh
sudo systemctl daemon-reload
```
