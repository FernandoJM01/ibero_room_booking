# Change: multi-room support

Date: 2026-09-27 · Branch: `feat/multi-room-support`

## Decisions (confirmed with the client before implementing)

1. **Room switcher, not a combined view.** Reservar/Calendario show one room at a
   time via a selector; `CalendarWeek`'s per-day block layout is unchanged (it never
   sees more than one room's data at once). A combined side-by-side view is future
   work, not built here.
2. **Rooms are a super-admin-managed, open-ended list** (name only required; location
   and capacity optional), not a fixed "Sala A/B". The secretary picks a room, required,
   on every reservation.
3. **Only the super admin manages the room list** (create, edit, retire) — same tier as
   Festivos/Semestre/Respaldos.
4. **One room per booking, always.** No "whichever room is free" auto-assignment — the
   secretary always picks a specific room explicitly.

## Why this isn't just "add a column"

Every overlap check in the system — 4 in the backend, 1 in the frontend — currently
tests "is *any* reservation active at this time," with no room dimension, because
there was only ever one room to conflict with. Each one gets a `room_id` filter added;
missing even one would either let two rooms double-book silently, or make Room B's
free slots look falsely busy because of Room A's bookings. This is treated as the
core correctness risk of the whole feature, not a detail.

## Phases

Built as sequential commits on one branch (the phases are too interdependent for
separate short-lived branches the way the original 7-item feedback list was) —
merged to `main` only after Phase 8's end-to-end verification.

| # | Phase | Scope |
|---|---|---|
| 1 | Database + rooms backend | `rooms` table, migration + backfill, `GET/POST/PUT` `/api/rooms` (super admin write), `room_id` threaded through every reservations endpoint and **every overlap check** |
| 2 | Reservation modal | Required "Sala" selector; live availability re-check on room change; recurring-series generation/save carries `room_id` |
| 3 | Room switcher | Selector on Reservar + Calendario (placement revised, see *Updates*); filters the client-side `Store` before it reaches `CalendarWeek`/`CalendarGrid`/`MiniCalendar` (no changes inside those components) |
| 4 | Historial, Estadísticas, exports | Sala column + filter in History; Sala filter in Estadísticas (there is no per-room usage ranking); Sala in export rows, filename and the PDF/Excel filter header |
| 5 | Admin: Salas tab | New CRUD tab, super-admin only, same card pattern as Festivos/Usuarios |
| 6 | Asistente IA | Required Sala field on the proposal card before save; AI never guesses the room. (The assistant is currently hidden in the UI, so this is not reachable from the menu.) |
| 7 | Emails | Confirmation/update/cancellation templates state which room |
| 8 | Verification + deploy notes | Live-tested per phase already; final end-to-end pass, migration/deploy instructions |

## Rollout

Migration `009_rooms.sql`: creates `rooms`, seeds one row (fixed id, name **"Sala
Principal"** — a placeholder, one edit away from whatever real name they want via the
new Salas tab), adds `reservations.room_id` nullable, backfills every existing row to
that seeded room, then sets the column `NOT NULL`. One file, idempotent (migrations
re-run on every backend start, matching the existing convention), so it's safe however
many times it applies.

## Status

All 8 phases implemented on branch `feat/multi-room-support`; each was verified live
against the local Docker stack when it landed.

Final backend pass (phase 8), run against the live API with two active rooms:

| Check | Result |
|---|---|
| Same time slot, different room | 201 (rooms don't block each other) |
| Overlapping slot, same room (create, both rooms) | 409 |
| Create without `room_id` | 400 |
| Edit into an overlap in the same room | 409 |
| Edit that moves a booking to another room into that room's overlap | 409 |
| Edit that moves a booking to another room's free slot | 200, response carries the new room |
| `POST /multi` with one conflicting interval | 409 (nothing saved) |
| Create / single cancel / bulk cancel emails | Sala row rendered (builders unit-checked; SMTP auth fails locally by design) |

## Deploy checklist (Dokploy)

1. **Back up first** — Admin → Respaldos → "Descargar respaldo SQL" (or `pg_dump`). The
   migration rewrites `reservations` (adds a `NOT NULL` column), so keep a copy.
2. Deploy the branch. The backend applies `009_rooms.sql` on start; look for
   `[Migrate] Applied 009_rooms.sql` in the logs.
3. Sanity check: `SELECT count(*) FROM reservations WHERE room_id IS NULL;` → `0`.
4. Log in as a super admin → **Salas**: rename "Sala Principal" to the real name and add
   the second room.
5. Hard-refresh browsers once if the old UI shows up (assets are cache-busted with the
   `?v=N` string in every HTML file, so this normally isn't needed).

**Rollback.** The migration is additive, but the previous release is **not**
compatible with the migrated database as-is: `reservations.room_id` is `NOT NULL`
with no default, so the old code's `INSERT`s fail. Pick one:

- *Restore the backup* taken in step 1 (loses anything created since), or
- *Keep the data* and relax the constraint before redeploying the old commit:
  ```sql
  ALTER TABLE reservations ALTER COLUMN room_id DROP NOT NULL;
  ```
  Verified on a copy of the database: the old code then creates reservations with
  `room_id = NULL`, and the next start of the new release re-runs `009_rooms.sql`,
  which assigns those rows to "Sala Principal" and restores `NOT NULL`. While the old
  code runs, all bookings share one calendar again (it has no notion of rooms).

## Known limits / follow-ups

- "Solicitudes" (modification requests) screens are dormant and were only
  signature-updated for `checkOverlap`, not functionally re-tested.
- Emails for that dormant flow show the room only when the row carries `room_name`.
- No per-room permissions or opening hours: every secretaria can book any active room.
- Deactivating a room hides it from selectors but keeps its history and existing
  bookings.

## Updates after the first delivery (2026-09-28 to 2026-10-05)

- **Selector placement.** The room selector moved out of the calendar toolbar: on
  desktop it lives in the top bar (so the calendar keeps its full height); on phones
  it is a full-width row inside the calendar card. `RoomSwitcher.bind()` keeps both
  selectors in sync and remembers the choice per browser.
- **Historial.** The Sala column is also visible on phones; the filters were
  redesigned (see `2026-09-28-sidebar-and-history-redesign.md`).
- **Día festivo vs. Cierre.** Unrelated to rooms but shipped on the same branch: a
  festivo is now only highlighted and stays bookable; only a cierre blocks the day
  (`2026-09-28-holiday-bookable.md`).
- **Known gap.** The reservation form does not pre-select the room currently shown
  in the calendar; the secretary chooses it again in the form.
