# One summary e-mail per recurring series (2026-10-06)

**Before.** A recurring series is saved date by date, and every date sent its own "Reservación confirmada" e-mail: a
9-week series meant 9 e-mails in a burst (and the same on a bulk cancel). Bursts can be throttled by the mail provider
and are noisy for the recipient.

**Now.**

| Action | E-mails to the responsible person |
| ------ | --------------------------------- |
| Create a recurring series of N dates | **1** summary listing the dates (`recurringSeriesCreatedEmail`); a series of one date gets the normal confirmation |
| Create one booking / a multi-interval booking | Unchanged (1 / one per interval) |
| Cancel several reservations together (series, bulk) | **1 per recipient**: the normal message if only one, otherwise a summary (`reservationsCancelledSummaryEmail`) |
| Edit or cancel a single date | Unchanged |

**How.** `POST /api/reservations` sends no e-mail when `recurring_group` is set. The client (`Recurring.save`) calls the new
`POST /api/reservations/recurring-group/:id/notify` once after saving the dates; it only covers active reservations of that group
created by the caller in the last 15 minutes (so it cannot be used to re-mail old series). If that call fails the series is
still saved (a warning is logged in the browser console).

**Notes.** Any other client that creates recurring dates through the API must call the notify endpoint itself, or no
confirmation is sent. The data migration (`import.sql`) sends no e-mail at all.

**Verified** against the development stack: 3 dates saved = 0 e-mails; notify = 1 e-mail; a single booking still sends its own;
a bulk cancel of 4 reservations = 1 summary e-mail.
