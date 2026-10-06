#!/usr/bin/env bash
# migrate.sh - runs the production data clean-up and import with checks around each step.
# Run on the server as root, from the folder that holds cleanup_keep_calendar.sql and import.sql:
#
#   sudo bash migrate.sh preview     read-only: what exists, and what the clean-up WOULD delete (rolled back)
#   sudo bash migrate.sh apply       backup, clean-up (Option C), import, verification   (IRREVERSIBLE without the backup)
#   sudo bash migrate.sh verify      only the verification queries
#
# Settings (environment): KEEP_EMAILS (default julieta.esquinca@ibero.mx), EXPECT_RESERVATIONS (45).
set -u
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
cd "$(dirname "$0")" || exit 1
KEEP="${KEEP_EMAILS:-julieta.esquinca@ibero.mx}"
EXPECT="${EXPECT_RESERVATIONS:-45}"
cid="$(docker ps -qf name=iberoreservationsdb | head -1)"
[ -n "$cid" ] || { echo "database container not running"; exit 1; }
psqlx() { docker exec -i "$cid" sh -c 'psql -v ON_ERROR_STOP=1 "$@" -U "$POSTGRES_USER" -d "$POSTGRES_DB"' sh "$@"; }
q()     { psqlx -X -P pager=off -c "$1"; }

verify() {
  echo "== Verification"
  q "SELECT (SELECT count(*) FROM reservations) AS reservaciones, (SELECT count(*) FROM reservations WHERE is_recurring) AS recurrentes, (SELECT count(*) FROM recurring_groups) AS series, (SELECT count(*) FROM audit_log WHERE action='create_reservation') AS historial_alta, (SELECT count(*) FROM reservations WHERE room_id IS NULL) AS sin_sala;"
  q "SELECT role, is_admin, active, email FROM users ORDER BY is_admin DESC, role, email;"
  q "SELECT name, active FROM rooms ORDER BY created_at;"
  n="$(psqlx -X -At -c 'SELECT count(*) FROM reservations')"
  [ "$n" = "$EXPECT" ] && echo "OK: $n reservations" || echo "!! expected $EXPECT reservations, found $n"
}

case "${1:-}" in
preview)
  echo "== Present state (read-only)"
  q "SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM reservations) reservations, (SELECT count(*) FROM recurring_groups) series, (SELECT count(*) FROM calendar_events) calendar_dates, (SELECT count(*) FROM rooms) rooms, (SELECT count(*) FROM external_contacts) contacts;"
  q "SELECT id, name, active FROM rooms ORDER BY created_at;"
  q "SELECT date, type, name FROM calendar_events ORDER BY date;"
  q "SELECT key, value FROM app_settings ORDER BY key;"
  echo; echo "== Dry run of the clean-up (everything is rolled back)"
  sed 's/^COMMIT;/ROLLBACK;/' cleanup_keep_calendar.sql | psqlx -X -v keep_emails="$KEEP" -P pager=off
  echo; echo "== After the dry run nothing changed:"; q "SELECT count(*) AS users_still_there FROM users;"
  ;;
apply)
  [ -f cleanup_keep_calendar.sql ] && [ -f import.sql ] || { echo "cleanup_keep_calendar.sql and import.sql must be in this folder"; exit 1; }
  echo "== 1. Backup right before the change"
  /usr/local/sbin/db-backup.sh || { echo "backup failed: STOPPING"; exit 1; }
  echo; echo "== 2. Clean-up (Option C: only $KEEP, calendar kept)"
  psqlx -X -v keep_emails="$KEEP" -P pager=off < cleanup_keep_calendar.sql || { echo "clean-up failed: nothing was changed"; exit 1; }
  echo; echo "== 3. Import"
  psqlx -X -P pager=off < import.sql || { echo "import failed: nothing was imported (single transaction); the clean-up already applied, the backup above restores the old data"; exit 1; }
  echo; verify
  echo; echo "Now delete the personal files:  shred -u import.sql cleanup_keep_calendar.sql"
  ;;
verify) verify ;;
*) sed -n 2,11p "$0"; exit 1 ;;
esac
