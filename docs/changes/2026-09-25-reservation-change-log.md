# Change: per-reservation change log ("Ver cambios") and History refresh fixes

Date: 2026-09-25

## What changed for users

- Every row in **Historial** (secretaries only) has a clock button, **Ver cambios**.
  It opens a timeline, newest first, of every creation, edit and cancellation of
  that reservation: who did it, the date and time (America/Mexico_City), and for
  edits exactly what changed, shown as old value → new value (date/time, responsible,
  *Nombre de la junta*, observations).
- After editing or cancelling a reservation, the History table now updates
  immediately (previously it kept showing the old row until a page reload).
- Bulk cancel from History works again (it always returned an error).

## Design

- **No new table.** `audit_log` already records user, action, entity id and
  timestamp for every reservation write. Its `details` JSONB column (previously unused
  for reservations) now stores the diff:
  - `create_reservation` → snapshot (`responsible_name`, `area`, `start_time`, `end_time`)
  - `update_reservation` → `{ changes: [{ field, from, to }] }`, with `field` one of
    `schedule` (start+end together), `responsible`, `area`, `observations`
  - `cancel_reservation` → `{ bulk: true }` when cancelled via bulk selection
- An edit that changes nothing writes no audit row.
- Timestamps are stored as UTC (`timestamptz`) and always rendered in
  `America/Mexico_City` by the frontend, independent of the viewer's browser settings.
- `GET /api/reservations/:id/history` (secretaria only). Migration
  `008_audit_log_entity_index.sql` adds `audit_log(entity, entity_id, timestamp DESC)`
  so the lookup stays fast as the table grows. The existing 18-month retention job
  already covers `audit_log`.

## Bugs found and fixed along the way

| Symptom | Cause | Fix |
|---|---|---|
| History row didn't change after an edit | The edit callback re-rendered a cached filtered list (`_filtered`) that still held the old object | Edit now re-runs `_applyFilters()`, as cancel already did |
| "Modificado por" / "Creado por" vanished after a write | `POST`/`PUT`/`DELETE` returned the raw row without the joined user names the list endpoint returns | All write endpoints return the same joined shape |
| Bulk cancel always failed (500) | `DELETE /bulk` was declared after `DELETE /:id`, so Express routed `/bulk` into the single-cancel handler (invalid uuid) | Route moved above `/:id`, with a comment explaining the ordering |
| Bulk cancel toast printed a Promise and the table refreshed before the data arrived | `Reservations.bulkCancel` is async but wasn't awaited | Awaited; failure now shows an error toast |
| Bulk cancel left no per-reservation trail | It wrote one audit row with no reservation id | One audit row per reservation |

## Notes

- Changes made **before** this release have no stored diff. Their timeline entry shows
  who and when, plus "Sin detalle del cambio (registrado antes de que existiera esta bitácora)".
- Cancelling an already-cancelled reservation is now a no-op (no audit row, no email).
- Deploy: backend and frontend both change (new migration 008, new endpoint, new
  script `reservation-history-modal.js`). Cache-buster is `?v=18`.
