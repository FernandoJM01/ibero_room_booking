#!/usr/bin/env bash
# devtunnel-watchdog.sh - heals the Dev Tunnel when it is silently disconnected, and tells people.
#
# Why: the `devtunnel host` process can stay "running" while disconnected ("Not authorized ... refreshed tunnel
# access token is not valid"), so systemd's Restart=always never fires. This checks the tunnel from the server and
# restarts the unit only when it is the tunnel (not the app) that is down, at most once every 10 minutes.
#
# E-mails (through devtunnel-notify.sh):
#   * recovered   - the tunnel came back; says how long it was down and how many restarts it took
#   * needs a person - restarted ESCALATE_AFTER times and still down (the Microsoft login probably expired)
#   * application down - the tunnel is not the problem, the API/Traefik is; no restart is attempted
# Repeats are limited to one per ALERT_EVERY seconds.
#
# Config (environment, all optional): WATCHDOG_URL, TUNNEL_HOST, THRESHOLD, MIN_INTERVAL, ESCALATE_AFTER,
# ALERT_EVERY, HEARTBEAT_URL, NOTIFY_CMD, WATCHDOG_UNIT, WATCHDOG_STATE_DIR, WATCHDOG_NOW (tests only).
set -u
UNIT="${WATCHDOG_UNIT:-devtunnel-reservations}"
URL="${WATCHDOG_URL:-https://npbkpmwc-80.usw3.devtunnels.ms/api/health}"     # through the tunnel relay
TUNNEL_HOST="${TUNNEL_HOST:-npbkpmwc-80.usw3.devtunnels.ms}"                   # Host header Traefik expects
THRESHOLD="${THRESHOLD:-2}"                                                    # consecutive failures before acting
MIN_INTERVAL="${MIN_INTERVAL:-600}"                                            # seconds between restarts
ESCALATE_AFTER="${ESCALATE_AFTER:-2}"                                          # restarts that did not help -> alert
ALERT_EVERY="${ALERT_EVERY:-3600}"                                             # seconds between repeated alerts
HEARTBEAT_URL="${HEARTBEAT_URL:-}"                                             # optional dead-man's-switch ping
NOTIFY_CMD="${NOTIFY_CMD:-/usr/local/sbin/devtunnel-notify.sh}"
DIR="${WATCHDOG_STATE_DIR:-/run}"
FAILS="$DIR/devtunnel-watchdog.failures"       # consecutive failed checks
DOWN="$DIR/devtunnel-watchdog.down-since"      # epoch when the outage was confirmed
RESTARTS="$DIR/devtunnel-watchdog.restarts"    # restarts done during this outage
LAST="$DIR/devtunnel-watchdog.last-restart"
LASTALERT="$DIR/devtunnel-watchdog.last-alert"
now="${WATCHDOG_NOW:-$(date +%s)}"

log() { logger -t devtunnel-watchdog -- "$*" 2>/dev/null; echo "$*"; }
num() { cat "$1" 2>/dev/null || echo 0; }
notify() {   # notify "<subject>" "<body>"
  [ -x "$NOTIFY_CMD" ] || { log "notify: $NOTIFY_CMD not found"; return 0; }
  "$NOTIFY_CMD" "$1" "$2$footer" >/dev/null 2>&1 || true
}
alert_throttled() {  # true when an alert was already sent less than ALERT_EVERY ago
  [ $(( now - $(num "$LASTALERT") )) -lt "$ALERT_EVERY" ]
}
footer="

--
Server: $(hostname)   Time (UTC): $(date -u -d "@$now" '+%F %T' 2>/dev/null || date -u)
Checked URL: $URL
Journal: journalctl -t devtunnel-watchdog --since '2 hours ago'
Procedure: docs/RUNBOOK.md, section 'Tunnel process running but site down'."

# 1) tunnel healthy -> report recovery if there was an outage, reset, stop
if curl -fsS -m 15 -o /dev/null "$URL" 2>/dev/null; then
  if [ -f "$DOWN" ]; then
    mins=$(( (now - $(num "$DOWN")) / 60 ))
    r=$(num "$RESTARTS")
    log "tunnel recovered after ~${mins} min and $r restart(s)"
    notify "[IberoReservas] RECOVERED: site is back (about ${mins} min down)" \
"The tunnel health check passes again.
Down for about ${mins} minute(s); the watchdog restarted the tunnel $r time(s).
Nothing else is needed, but if this repeats weekly please tell the project owner."
  fi
  rm -f "$FAILS" "$DOWN" "$RESTARTS" "$LASTALERT"
  [ -n "$HEARTBEAT_URL" ] && curl -fsS -m 10 -o /dev/null "$HEARTBEAT_URL" 2>/dev/null
  exit 0
fi

n=$(( $(num "$FAILS") + 1 ))
echo "$n" > "$FAILS"
log "tunnel health check failed ($n/$THRESHOLD): $URL"
[ "$n" -lt "$THRESHOLD" ] && exit 0
[ -f "$DOWN" ] || echo "$now" > "$DOWN"

# 2) is the application itself healthy? If not, restarting the tunnel will not help.
if ! curl -fsS -m 10 -o /dev/null -H "Host: $TUNNEL_HOST" http://127.0.0.1/api/health 2>/dev/null; then
  log "application is not healthy locally: NOT restarting the tunnel (investigate the API/Traefik)"
  if ! alert_throttled; then
    echo "$now" > "$LASTALERT"
    notify "[IberoReservas] ALERT: the application is down on the server" \
"The site is unreachable AND the application does not answer locally through Traefik, so the tunnel is not the
cause and the watchdog is NOT restarting it. Look at the API/Traefik/database containers:
  sudo docker service ls
  sudo docker service logs --tail 50 \$(sudo docker service ls -qf name=reservationsapi)"
  fi
  exit 0
fi

# 3) throttle restarts
since=$(( now - $(num "$LAST") ))
if [ "$since" -lt "$MIN_INTERVAL" ]; then
  log "restart skipped: last restart was ${since}s ago (minimum $MIN_INTERVAL s)"
else
  # 4) restart only the tunnel unit
  log "application healthy but tunnel down: restarting $UNIT"
  if systemctl restart "$UNIT"; then
    echo "$now" > "$LAST"; echo $(( $(num "$RESTARTS") + 1 )) > "$RESTARTS"; rm -f "$FAILS"
    log "restarted $UNIT"
  else
    log "restart of $UNIT FAILED"
  fi
fi

# 5) restarts did not help: a person is needed (usually the Microsoft login expired)
if [ "$(num "$RESTARTS")" -ge "$ESCALATE_AFTER" ] && ! alert_throttled; then
  echo "$now" > "$LASTALERT"
  mins=$(( (now - $(num "$DOWN")) / 60 ))
  notify "[IberoReservas] ACTION NEEDED: site down ~${mins} min, automatic restarts did not help" \
"The Dev Tunnel does not come back after $(num "$RESTARTS") automatic restarts. The usual cause is an expired or
revoked Microsoft login (log line: 'Not authorized ... refreshed tunnel access token is not valid').

Fix (as the tunnel account holder), on the server:
  sudo -u acardena -H /home/acardena/bin/devtunnel user login -d   # follow the device-code instructions
  sudo systemctl restart devtunnel-reservations
Check:  curl -s https://deii-salas.uk/api/health
If the tunnel itself expired or the account changed, see docs/RUNBOOK.md: 'Check and extend the tunnel expiry'."
fi
exit 0
