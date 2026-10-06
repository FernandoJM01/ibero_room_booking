# Change: academics see room availability; form pre-selects the room (2026-10-06)

## What changed

1. **Academics can see when each room is busy.** The Calendario now shows their own
   reservations in full plus everyone else's *active* reservations as anonymous grey
   blocks labelled "Ocupado" (date, time and room only; clicking one says "Sala ocupada").
   They still cannot book, edit or cancel. Historial stays limited to their own.
2. **The reservation form opens on the room shown in the calendar** (new bookings and
   paste). It can still be changed. Edits keep the reservation's own room.

## Why the backend changed too

- `GET /api/reservations?availability=1` (academic only) returns the academic's own
  reservations in full plus others' active ones reduced to
  `{id, room, start, end, status:'active', busy_only:true, responsible:'Ocupado', area:'Ocupado'}`.
  The default (no parameter) is still "own only". The `responsible` filter is ignored in
  this mode so it can't be used to probe who booked.
- **Two existing leaks were closed.** Before this change an academic could
  `GET /api/reservations/:id` for **any** reservation and receive it in full (name, subject,
  notes), and `GET /api/reservations/week` returned everyone's bookings in full. The first
  now answers 404 unless the reservation is theirs; the second is anonymised for academics.
  Verified against the dev database before and after.

## Privacy decision

The client chose "availability yes, details no". If it ever wants academics to see *who*
holds a slot, change `toBusySlot()` in `backend/routes/reservations.js`.

## Files

`backend/routes/reservations.js`, `frontend/js/core/api.js` (`busyOnly`),
`frontend/js/pages/calendar-page.js`, `frontend/js/components/calendar-grid.js`,
`calendar-week.js`, `frontend/css/components/calendar.css` (`.is-busy`),
`frontend/js/components/reservation-modal.js` (`roomId`), `frontend/js/pages/dashboard.js`.

## Related, not code

- [`docs/SERVER_CONFIGURATION.md`](../SERVER_CONFIGURATION.md): where every configuration lives.
- [RUNBOOK: Verify the login rate limit](../RUNBOOK.md#verify-the-login-rate-limit-shared-by-everyone-or-per-client):
  how to check in production whether the 5-attempts limit is shared by all users.
