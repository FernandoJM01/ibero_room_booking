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
| 3 | Room switcher | Selector on Reservar + Calendario; filters the client-side `Store` before it reaches `CalendarWeek`/`CalendarGrid`/`MiniCalendar` (no changes inside those components) |
| 4 | Historial, Estadísticas, exports | Sala column + filter in History; Sala filter + "Sala más utilizada" in Estadísticas; Sala in export rows, filename and the PDF/Excel filter header |
| 5 | Admin: Salas tab | New CRUD tab, super-admin only, same card pattern as Festivos/Usuarios |
| 6 | Asistente IA | Required Sala field on the proposal card before save; AI never guesses the room |
| 7 | Emails | Confirmation/update/cancellation templates state which room |
| 8 | Verification + deploy notes | Live-tested per phase already; final end-to-end pass, migration/deploy instructions |

## Rollout

Migration `009_rooms.sql`: creates `rooms`, seeds one row (fixed id, name **"Sala
Principal"** — a placeholder, one edit away from whatever real name they want via the
new Salas tab), adds `reservations.room_id` nullable, backfills every existing row to
that seeded room, then sets the column `NOT NULL`. One file, idempotent (migrations
re-run on every backend start, matching the existing convention), so it's safe however
many times it applies.
