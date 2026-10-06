# db-migration

One-time helper to clean the production database (Option C: only the administrator, calendar kept) and import the
professor's reservations, with a backup first and a verification after. Procedure and reasoning:
[DATA_MIGRATION](../../docs/DATA_MIGRATION.md); commands: [WATCHDOG_AND_BACKUPS §7](../../docs/WATCHDOG_AND_BACKUPS.md#7-one-time-data-migration-commands-clean-up-and-import).

`migrate.sh preview | apply | verify` (run with `sudo` next to `cleanup_keep_calendar.sql` and `import.sql`). The two SQL files
are not in git when they hold personal data (`import.sql` is generated into the git-ignored `scripts/import-sessions/private/`).
