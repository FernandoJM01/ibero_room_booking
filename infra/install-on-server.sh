#!/usr/bin/env bash
# install-on-server.sh - installs the tunnel watchdog (with e-mail alerts) and the nightly database backup.
# Run ONCE on the server as root from the folder that contains this file:   sudo bash install-on-server.sh
# Additive only: it touches no application, Dokploy, Traefik, tunnel or Cloudflare setting. Re-running it is safe.
# Remove everything with the "Remove" sections of tunnel-watchdog/README.md and db-backup/README.md.
set -u
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
cd "$(dirname "$0")" || exit 1
DT=/home/acardena/bin/devtunnel
URL_HOST="npbkpmwc-80.usw3.devtunnels.ms"

echo "== 1. The tunnel host the watchdog checks must be the CURRENT one"
cur="$(runuser -u acardena -- "$DT" show ibero-reservas.usw3 2>/dev/null | grep -oE '[a-z0-9]+-80\.usw3\.devtunnels\.ms' | head -1)"
echo "   devtunnel reports: ${cur:-nothing}   watchdog default: $URL_HOST"
if [ "$cur" != "$URL_HOST" ]; then echo "   MISMATCH: stopping. Edit WATCHDOG_URL/TUNNEL_HOST first (README)."; exit 1; fi

echo "== 2. Install files"
install -m 0755 tunnel-watchdog/devtunnel-watchdog.sh /usr/local/sbin/devtunnel-watchdog.sh
install -m 0755 tunnel-watchdog/devtunnel-notify.sh   /usr/local/sbin/devtunnel-notify.sh
install -m 0644 tunnel-watchdog/devtunnel-watchdog.service /etc/systemd/system/devtunnel-watchdog.service
install -m 0644 tunnel-watchdog/devtunnel-watchdog.timer   /etc/systemd/system/devtunnel-watchdog.timer
install -m 0755 db-backup/db-backup.sh /usr/local/sbin/db-backup.sh
install -m 0644 db-backup/ibero-db-backup.service /etc/systemd/system/ibero-db-backup.service
install -m 0644 db-backup/ibero-db-backup.timer   /etc/systemd/system/ibero-db-backup.timer
systemctl daemon-reload

echo "== 3. First database backup (before anything else changes)"
/usr/local/sbin/db-backup.sh || echo "   !! backup failed: fix before continuing"

echo "== 4. Test e-mail to the two people (check both inboxes, also spam)"
/usr/local/sbin/devtunnel-notify.sh "[IberoReservas] TEST" "Test of the watchdog e-mail from $(hostname). No action needed."

echo "== 5. One manual watchdog run (no output = tunnel healthy)"
/usr/local/sbin/devtunnel-watchdog.sh

echo "== 6. Enable the timers"
systemctl enable --now devtunnel-watchdog.timer ibero-db-backup.timer
systemctl list-timers devtunnel-watchdog.timer ibero-db-backup.timer --no-pager
echo; ls -l /var/backups/ibero/
echo "DONE"
