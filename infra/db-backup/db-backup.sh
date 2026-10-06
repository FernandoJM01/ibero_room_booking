#!/usr/bin/env bash
# db-backup.sh - nightly logical backup of the application database (pg_dump | gzip), kept N days.
# Runs as root from a systemd timer. The file holds personal data: the folder is root-only (700, files 600).
# On failure it e-mails the on-call people through devtunnel-notify.sh. It does NOT copy the file off the server:
# that destination is a decision still open (docs/PLAN_AVAILABILITY_AND_SECURITY.md, section 8).
#
# Config (env, optional): BACKUP_DIR, KEEP_DAYS, DB_NAME_FILTER, NOTIFY_CMD.
set -uo pipefail
DIR="${BACKUP_DIR:-/var/backups/ibero}"
KEEP="${KEEP_DAYS:-14}"
FILTER="${DB_NAME_FILTER:-iberoreservationsdb}"
NOTIFY_CMD="${NOTIFY_CMD:-/usr/local/sbin/devtunnel-notify.sh}"
log() { logger -t ibero-db-backup -- "$*" 2>/dev/null; echo "$*"; }
fail() {
  log "BACKUP FAILED: $*"
  [ -x "$NOTIFY_CMD" ] && "$NOTIFY_CMD" "[IberoReservas] ALERT: nightly database backup FAILED" \
"The nightly backup did not complete: $*

Check on the server:  journalctl -t ibero-db-backup --since '2 days ago'
Nothing else is affected, but until it works the newest backup is older than 24 h." >/dev/null 2>&1
  rm -f "${tmp:-/nonexistent}"
  exit 1
}

umask 077
mkdir -p "$DIR" && chmod 700 "$DIR" || fail "cannot create $DIR"
cid="$(docker ps -qf "name=$FILTER" | head -1)"
[ -n "$cid" ] || fail "database container ($FILTER) is not running"

out="$DIR/backup_$(date -u +%F_%H%M).sql.gz"
tmp="$out.part"
docker exec "$cid" sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$tmp" \
  || fail "pg_dump or gzip returned an error"
gzip -t "$tmp" 2>/dev/null                         || fail "the compressed file is corrupt"
size="$(stat -c %s "$tmp")"
[ "$size" -gt 2000 ]                               || fail "the file is suspiciously small (${size} bytes)"
zcat "$tmp" | tail -n 5 | grep -q 'PostgreSQL database dump complete' || fail "the dump is incomplete (no end marker)"
mv "$tmp" "$out"

find "$DIR" -maxdepth 1 -name 'backup_*.sql.gz' -mtime "+$KEEP" -delete
log "backup ok: $out (${size} bytes); $(find "$DIR" -maxdepth 1 -name 'backup_*.sql.gz' | wc -l) file(s) kept, $KEEP-day retention"
