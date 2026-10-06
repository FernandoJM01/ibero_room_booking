#!/usr/bin/env bash
# devtunnel-watchdog.sh - restarts devtunnel-reservations when the tunnel is silently disconnected.
#
# Why: the `devtunnel host` process can stay "running" while disconnected ("Not authorized ... refreshed tunnel
# access token is not valid"), so systemd's Restart=always never fires. This checks the tunnel from the server and
# restarts the unit only when it is the tunnel (not the app) that is down, at most once every 10 minutes.
#
# Config (environment, all optional): WATCHDOG_URL, TUNNEL_HOST, THRESHOLD, MIN_INTERVAL, WATCHDOG_STATE_DIR.
set -u
UNIT="${WATCHDOG_UNIT:-devtunnel-reservations}"
URL="${WATCHDOG_URL:-https://npbkpmwc-80.usw3.devtunnels.ms/api/health}"     # through the tunnel relay
TUNNEL_HOST="${TUNNEL_HOST:-npbkpmwc-80.usw3.devtunnels.ms}"                   # Host header Traefik expects
THRESHOLD="${THRESHOLD:-2}"                                                    # consecutive failures before acting
MIN_INTERVAL="${MIN_INTERVAL:-600}"                                            # seconds between restarts
DIR="${WATCHDOG_STATE_DIR:-/run}"
FAILS="$DIR/devtunnel-watchdog.failures"
LAST="$DIR/devtunnel-watchdog.last-restart"

log() { logger -t devtunnel-watchdog -- "$*" 2>/dev/null; echo "$*"; }

# 1) tunnel healthy -> reset the counter and stop
if curl -fsS -m 15 -o /dev/null "$URL" 2>/dev/null; then
  rm -f "$FAILS"
  exit 0
fi

n=$(( $(cat "$FAILS" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAILS"
log "tunnel health check failed ($n/$THRESHOLD): $URL"
[ "$n" -lt "$THRESHOLD" ] && exit 0

# 2) is the application itself healthy? If not, restarting the tunnel will not help.
if ! curl -fsS -m 10 -o /dev/null -H "Host: $TUNNEL_HOST" http://127.0.0.1/api/health 2>/dev/null; then
  log "application is not healthy locally: NOT restarting the tunnel (investigate the API/Traefik)"
  exit 0
fi

# 3) throttle
now=$(date +%s); last=$(cat "$LAST" 2>/dev/null || echo 0)
if [ $(( now - last )) -lt "$MIN_INTERVAL" ]; then
  log "restart skipped: last restart was $(( now - last ))s ago (minimum $MIN_INTERVAL s)"
  exit 0
fi

# 4) restart only the tunnel unit
log "application healthy but tunnel down: restarting $UNIT"
systemctl restart "$UNIT" && { echo "$now" > "$LAST"; rm -f "$FAILS"; log "restarted $UNIT"; }
