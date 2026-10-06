# db-backup

Nightly logical backup of the application database. Additive: it only reads the database.

- `db-backup.sh` runs `pg_dump --clean --if-exists` inside the database container, compresses it to
  `/var/backups/ibero/backup_YYYY-MM-DD_HHMM.sql.gz` (root-only, mode 600), verifies it (gzip test, minimum size,
  the dump's end marker), keeps **14 days**, and e-mails the on-call people if anything fails.
- `ibero-db-backup.timer` runs it daily at 02:00 UTC (20:00 Mexico City), `Persistent=true` so a missed run (server was
  off) happens at the next boot.
- **Not done:** copying the file **off the server**. A backup on the same disk does not survive the disk. The destination
  is an open decision ([plan, section 8](../../docs/PLAN_AVAILABILITY_AND_SECURITY.md)); until then copy the newest file
  by hand now and then (`scp`), and before any risky change.

Install with [`../install-on-server.sh`](../install-on-server.sh). Run by hand: `sudo /usr/local/sbin/db-backup.sh`.
Restore: [RUNBOOK, Restore a backup](../../docs/RUNBOOK.md#restore-a-backup) (use `zcat file | sudo docker exec -i <db> psql ...`).
Journal: `journalctl -t ibero-db-backup`.

## Remove

```bash
sudo systemctl disable --now ibero-db-backup.timer
sudo rm /etc/systemd/system/ibero-db-backup.{service,timer} /usr/local/sbin/db-backup.sh
sudo systemctl daemon-reload
```
