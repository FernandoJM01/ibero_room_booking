# Preloading the existing reservations (data migration)

How to load the reservations the professor provided (an Excel file with one row per hour of
use) into IberoReservations, and how to clear the data that is already there first. Everything
here was **rehearsed end to end on a disposable copy of the system** that started from the
same state as production (default seed only); see [section 8](#8-what-was-rehearsed).

Related: [RUNBOOK](RUNBOOK.md) (backup and restore), [DEPLOYMENT §4](DEPLOYMENT.md#4-database-initialization)
(database reset), the tool in [`scripts/import-sessions/`](../scripts/import-sessions/README.md).

> **The Excel file contains personal data** (names, and the emails you add). It must never be
> committed. The repository ignores it (`/isaac_sesiones_*.xlsx`, and everything under
> `scripts/import-sessions/private/`). Keep working copies in that `private/` folder.

## 1. What is being loaded

| | |
| --- | --- |
| File | One sheet, columns `fecha, inicio, fin, sala, materia, nombre, apaterno, amaterno` |
| Rows | 67 one-hour rows, 2026-10-06 to 2026-12-03, Monday to Friday, 09:00–17:00 |
| Room | A single room code in the whole file (`SJDEII`) |
| People | 4 (name only, **no emails**) |
| Subject (`materia`) | `RESERVA AULA` (65 rows) and `JUNTA CCA` (2 rows) |

Decisions taken with the client:

| Topic | Decision |
| ----- | -------- |
| Consecutive hours | **Merged** into one booking (13:00, 14:00, 15:00, 16:00 become 13:00–17:00): 67 rows become **45 bookings** (37 of 1 h, 1 of 2 h, 7 of 4 h). No overlaps |
| Weekly patterns | Stored as **recurring series** (purple in the calendar; can be moved or cancelled as a series). A pattern needs at least 3 weekly repetitions with the same weekday and hours; gaps are allowed (for example a public holiday). That gives **5 series (42 bookings)** and **3 single bookings** |
| Room | The seeded room "Sala Principal" is **renamed** to the real name (to be confirmed, proposed "Sala de Juntas DEII") and everything is loaded there |
| People | Created as **Académico** accounts using the **real emails** the client will provide |
| Subject text | Kept exactly as in the file (`RESERVA AULA`, `JUNTA CCA`) as the "Nombre de la junta" |
| Creator | Every booking shows as created by the administrator account you pass with `--admin-email` |
| Emails | **None are sent** by the load (it writes straight to the database) |

Already settled:

- The 4 **institutional emails** were provided (kept in the git-ignored `private/people.csv`).
- **Festivos are bookable.** Only an institutional closure blocks a day, so the booking on 2 Nov 2026 (a seeded festivo) is valid. The tool's `--holiday-dates` option only prints a reminder and is optional.

**Still needed before the real load:**

1. The **spelling with accents** of the 4 names (the file is in capitals without accents), e.g. Gerónimo, Girón, Jiménez, René; they go in the `nombre_mostrar` column of the people CSV.
2. The real **room name**.
3. The real **calendar**: festivos, institutional closures and semester dates (see [section 4](#4-step-by-step-in-production)). Pass any closure that falls between 6 Oct and 3 Dec to `--closure-dates` and the tool will refuse to load a booking on it.

## 2. Why this is not part of the seed or a migration

- **Personal data does not belong in Git.** `backend/db/seed.sql` and the migrations are versioned.
- **Migrations run on every start.** A migration that inserted bookings would bring back, on the next
  restart, any booking someone had deliberately deleted.
- The seed only runs on an **empty** database, so it can't be re-applied to a live system anyway.

So the seed stays generic (administrator, one room, sample holidays) and the data load is a separate,
reviewable, **idempotent** step you run once.

## 3. The tool

[`scripts/import-sessions/import_sessions.py`](../scripts/import-sessions/import_sessions.py) reads the
Excel and writes two SQL files. It never connects to a database.

- Validates the file and **stops on errors** (missing data, Sundays, hours outside 07:00–21:00,
  overlaps, a closure date, unknown people).
- `import.sql`: one transaction, so it is **all or nothing**; **idempotent** (stable IDs, so a second run
  changes nothing); aborts if anything it loads would overlap another active booking in the room;
  writes a "Reservación creada" entry in the change history for each booking.
- `rollback.sql`: removes exactly what `import.sql` created (reservations, their history entries, the
  series and the accounts it created if they have no other reservations). It does not undo the room rename.
- Accounts get a **random, unusable password**: nobody can log in until they use *¿Olvidaste tu contraseña?*
  (needs working email) or an administrator sets a password in *Usuarios › Editar*.

## 4. Step by step in production

Do it outside working hours and tell the secretaries not to book meanwhile.

1. **Merge and deploy** the multi-room branch (see [RUNBOOK](RUNBOOK.md#deploy-new-code)). The API applies
   any pending migrations on start (production was last verified at `006`, so `007`–`009` are expected); check the logs for `[Migrate] Applied 009_rooms.sql`, and
   `curl -s https://deii-salas.uk/api/health`.
2. **Back up.** Download it from *Administración › Respaldos* **and** run the `pg_dump` command in the
   [RUNBOOK](RUNBOOK.md#backup-the-database). Copy it off the server. Both cleanup options are irreversible.
3. **Clear the old data** with Option A or B ([section 5](#5-clearing-the-old-data-pick-one)).
4. **Re-create configuration the cleanup removed or that was never set**, as a Super Administrator:
   - *Administración › Calendario*: the real **festivos and cierres**, and the **semester dates**.
   - *Administración › Usuarios*: the secretary accounts (Option A removes them).
5. **Generate the SQL** on your computer (it needs the Excel and the people CSV):
   ```bash
   .venv/bin/python scripts/import-sessions/import_sessions.py \
     --xlsx scripts/import-sessions/private/sesiones.xlsx \
     --people scripts/import-sessions/private/people.csv \
     --room-name "Real room name" --admin-email admin.email@ibero.mx \
     --closure-dates <cierres separados por coma> \
     --out-dir scripts/import-sessions/private
   ```
   Read the report: expected **45 reservations, 5 series, 3 single bookings, 4 people**. Errors stop everything; a warning only asks you to double-check. Open `import.sql` if you want to read it.
6. **Copy it to the server and apply it** (the file has names and emails; delete the copy afterwards):
   ```bash
   scp -J <user>@antares.dci.uia.mx scripts/import-sessions/private/import.sql <user>@<server-ip>:~/
   # on the server:
   sudo docker exec -i $(sudo docker ps -qf "name=iberoreservationsdb") \
     sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ~/import.sql
   shred -u ~/import.sql
   ```
   It prints `reservaciones_cargadas = 45` and `COMMIT`. Any error means nothing was applied.
7. **Verify** ([section 6](#6-verification)) and tell the 4 people how to get access (they can use
   *¿Olvidaste tu contraseña?* once the email service works; see [SMTP guide](SMTP_ADMIN_GUIDE.md)).

For a local copy, replace the `ssh`/`sudo docker exec` part with
`docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < import.sql`.

## 5. Clearing the old data (pick one)

| | **Option A: clean database** | **Option B: only reservations and history** |
| - | ---------------------------- | ------------------------------------------- |
| Deletes | **Everything**: users, rooms, festivos/cierres, semester dates, external contacts, reservations, history, email log | Reservations, series, change requests, change history of reservations, email log |
| Keeps | Nothing | Users (and their passwords), rooms, festivos/cierres, semester dates, external contacts |
| Comes back by itself | The seed: one super administrator (`julieta.esquinca@ibero.mx` with the **public default password**), the room "Sala Principal" and sample holidays dated 2026 | Nothing needs to come back |
| Do afterwards | **Change the administrator's password immediately**, re-create secretaries, set the real calendar | Review the users list for old test accounts |
| Choose it when | Production only holds test data and you want a pristine start | There are real accounts or configuration you want to keep |

> The seed account has the name of a real person and a password that is written in the README. After
> Option A, treat it as compromised until you change the password.

### Option A: clean database

Follow [DEPLOYMENT §4](DEPLOYMENT.md#4-database-initialization) exactly: drop the schema inside the API
container, reload `schema.sql` and `seed.sql`, then **restart or redeploy the API** so the migrations run.
(Rehearsed: after the restart the log shows `Applied 009_rooms.sql`, the seed login works and the database
holds 1 user, the room "Sala Principal" and no reservations.)

### Option B: only reservations and history

[`scripts/import-sessions/cleanup_reservations.sql`](../scripts/import-sessions/cleanup_reservations.sql)
prints the counts before and after and runs in one transaction:

```bash
scp -J <user>@antares.dci.uia.mx scripts/import-sessions/cleanup_reservations.sql <user>@<server-ip>:~/
# on the server (after the backup):
sudo docker exec -i $(sudo docker ps -qf "name=iberoreservationsdb") \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ~/cleanup_reservations.sql
```

It contains a commented line to also remove old external contacts.

## 6. Verification

On the database (same `psql` command as above):

```sql
SELECT count(*) FROM reservations;                                   -- 45 (plus any you created since)
SELECT count(*) FROM reservations WHERE is_recurring;                -- 42
SELECT count(*) FROM recurring_groups;                               -- 5
SELECT name FROM rooms;                                              -- the real room name
SELECT count(*) FROM audit_log WHERE action = 'create_reservation';  -- 45
SELECT count(*) FROM reservations WHERE room_id IS NULL;             -- 0
```

In the application, as a Super Administrator:

1. *Reservar*: the room selector shows the real name; October and November show the bookings, series in
   purple (for example Monday 13:00–17:00 as one block), "Recurrentes activas" reads 42.
2. *Historial*: 45 rows; a row's **Ver cambios** shows "Reservación creada".
3. Try booking inside an imported slot: the form must answer "Traslape".
4. *Usuarios*: the 4 people appear as Académico.
5. Log in as one of them (after they set a password): the Calendario shows their own bookings in full and
   the rest as grey "Ocupado" blocks.

## 7. Rollback

If something is wrong after loading: generate `rollback.sql` (it is created together with `import.sql`) and
apply it the same way. It removes only what the load created. If you also ran a cleanup, the way back to
the old data is the **backup from step 2** ([restore procedure](RUNBOOK.md#restore-a-backup)).

## 8. What was rehearsed

On a throwaway copy with fictional emails (default seed only, as production starts), with the real file:

| Check | Result |
| ----- | ------ |
| Dry run without emails | Refuses to generate SQL and names the missing emails |
| `import.sql` | 45 reservations, 5 series, 4 accounts, 45 history entries, room renamed; times correct in Mexico City time |
| Applying it twice | Nothing duplicated (idempotent) |
| Through the application | API lists 45 (42 recurring); history shows "created"; an imported account cannot log in with a guessed password; booking inside an imported slot is refused (409); the adjacent hour is accepted |
| `rollback.sql` | Back to 0 reservations and 1 user |
| Option B | Reservations, series, history and email log emptied; users, room and festivos kept |
| Option A (DEPLOYMENT §4) | Clean schema, migrations applied after the restart, seed login works, import then loads normally |

**Not rehearsed** (needs the real server): the `scp`/`ssh` transfer and the production deploy itself.
