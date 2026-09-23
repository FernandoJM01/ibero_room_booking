# Change request: secretary feedback (2026-09-22)

Seven items reported by the secretary using the system in production, plus one
security fix folded into the same window. This document is the implementation
plan: root cause (where already found by code review), risk, phase and
verification for each item. Nothing described here has been implemented yet.

**Context that shapes this plan:** the system is live and about to be
evaluated by the professor. We optimize for *not breaking what already
works*, not for speed. Every phase below ships and is verified independently;
we do not batch everything into one large deploy.

## How we'll manage this professionally

- **One GitHub Issue per item** (`#1`.."#8" below), each linked to the PR that
  closes it. This replaces tracking work through chat.
- **One short-lived branch per phase**, off `main`, named `fix/<short-slug>`.
  A phase's items are small and related enough to share a branch and one PR;
  Phase 5 (item 7) gets its own branch because it is materially riskier.
- **Local verification before every deploy:** reproduce the bug in
  `docker compose up` locally, confirm the fix, run through the manual
  regression checklist for the screen touched (below), *then* deploy.
- **Deploy one phase at a time** through Dokploy, confirm
  `GET /api/health` and a manual smoke test on https://deii-salas.uk, then move
  to the next phase. See [RUNBOOK: Deploy new code](../RUNBOOK.md#deploy-new-code).
- **Backup before any phase that touches data or authorization**
  (Phases 4 and 5): [RUNBOOK: Backup the database](../RUNBOOK.md#backup-the-database).
- **Record every deploy** in [DEPLOYMENT.md's change history](../DEPLOYMENT.md#change-history)
  the same way the 2026-09-21 tunnel migration was recorded.
- **No phase touches the database schema** except Phase 5, and Phase 5 turns
  out not to need one either (see below) — the riskiest-sounding item is
  actually the safest to implement.

## Summary

| # | Item (as reported) | Type | Root cause found? | Risk | Phase |
|---|---|---|---|---|---|
| 0 | Any secretary can create a super-admin account | Security | Yes — confirmed in code review | High impact, low effort | **Phase 1 — done, pending deploy** |
| 1 | "Área" label is confusing on the reservation form | UX copy | Yes — needs one product decision first | Low | Phase 2 — done, pending deploy |
| 3 | Export to PDF/CSV/Excel "disappears" in History | Bug | Yes — confirmed | Low | Phase 2 — done, pending deploy |
| 4 | Clicking outside a modal closes it and loses work | UX | Yes — confirmed, 2 components | Low | Phase 2 — done, pending deploy |
| 6a | Recurring reservations: error shown even though rows were created, calendar doesn't refresh | Bug | Yes — confirmed, dead function call | Low | Phase 2 — done, pending deploy |
| 2 | Dashboard stops responding to clicks after creating one reservation | Bug | Hypothesis only, needs live reproduction | Medium | Phase 3 |
| 5 | Allow booking on some Saturdays | Feature | Yes — current rule found, needs a product decision | Medium | Phase 3 |
| 6b | Recurrence UX: rename "Ocurrencias", add a "Semester" option | UX + feature | N/A — needs a design discussion | Medium | Phase 4 (discussion first) |
| 7 | Remove the "Solicitudes de cambio" approval workflow; let any secretary edit/cancel, attributed in History | Workflow + authorization | Yes — **no schema change needed** | Medium | Phase 5 |

---

## Phase 1 — Security hotfix (do this first, alone)

### #0. Any secretary can create a super administrator

**Where:** [`backend/routes/users.js`](../../backend/routes/users.js) — `POST
/api/users` is guarded by `requireRole('secretaria')` (any secretary), but the
handler inserts `is_admin` straight from the request body:

```js
[name, email, passwordHash, role, is_admin || false]
```

A secretary (a role meant to have no admin rights) can send
`{ ..., "is_admin": true }` and create a second super administrator for
themselves.

**Fix:** ignore `is_admin` from the body unless the caller already is a super
admin (`req.user.isAdmin`). Super admins keep the ability to create other
super admins from this same endpoint; regular secretaries can only create
`secretaria`/`academico` accounts, as the route's own comment already claims
it does.

**Risk of the fix:** very low — it only removes a capability nobody should
have had. It cannot break an existing legitimate flow, because no legitimate
flow relies on a plain secretary creating an admin.

**Verification:**
1. Log in as a non-admin secretary, `POST /api/users` with `is_admin: true` →
   confirm the created user has `is_admin: false`.
2. Log in as the super admin, create a user with `is_admin: true` → confirm it
   still works.
3. Existing users are unaffected (this only changes what a *new* insert can
   set).

**Deploy:** on its own, first, before anything else in this document. It is a
one-line change with no UI impact, safe to ship immediately.

---

## Phase 2 — Low-risk fixes (one branch, one PR)

These four are small, independent, and each has a confirmed cause. Bundle
them because none touches the others' files, and test each one individually
before deploying all four together.

### #1. "Área" label on the reservation form

**Where:** the label appears in three places: the form field in
[`reservation-modal.js`](../../frontend/js/components/reservation-modal.js:349)
(`Área`, placeholder "Ej: Coordinación de Posgrado"), the confirmation emails in
[`mailer.js`](../../backend/utils/mailer.js) (two templates), and the exported
columns in [`export.js`](../../frontend/js/modules/export.js) (`'Área': r.area`).

**One decision needed before coding (30 seconds):** the field is currently a
free-text box for *which department is booking* (its own example is
"Coordinación de Posgrado", not a meeting title). There are two different
fixes depending on what's actually confusing the secretary:

- **Option A — relabel only (recommended, ships today):** the field keeps
  meaning "requesting department/area," we just make the label say so
  unambiguously, e.g. **"Área o departamento que solicita"**. No backend
  change, no data implication, zero risk.
- **Option B — change its meaning to a meeting title/subject:** this is a
  different field conceptually (what the meeting is about, not who's asking).
  It would need a new optional column, and a decision on what happens to the
  ~existing rows' "área" data. This is a small but real feature, not a label
  fix — if this is what's wanted, it should be its own item, not bundled here.

Confirm with the secretary which one she meant before implementing; assume
Option A if there's no time to ask.

**Verification:** create a reservation, confirm the label reads correctly on
the form, in the confirmation email, and in a PDF/Excel export.

### #3. Export buttons "disappear" in History

**Root cause:** the app uses a custom client-side navigation system
([`sidebar.js`](../../frontend/js/components/sidebar.js), a PJAX-style router:
it `fetch()`es the target page and swaps `innerHTML`). **Scripts inserted via
`innerHTML` never execute** — this is a browser rule, not a bug in the fetch
logic. `historial.html`'s page-specific scripts (`export.js`, the jsPDF/SheetJS
CDN libraries, `history-page.js` itself) live in `<script src="">` tags outside
the swapped region. If the secretary reaches History by clicking the sidebar
link from another page (the normal flow), instead of a hard page load, those
scripts are simply never loaded — `Export` is `undefined`, and the code path
that reveals the button group (`history-page.js:434`) never runs. A hard
refresh on `/historial.html` loads everything correctly, which is why it looks
like the buttons "come and go."

**This is the same class of bug as item #2 and part of #6** — the SPA
navigation layer swapping HTML without re-running the new page's scripts is a
recurring source of "works after refresh, breaks after navigating" reports.
Worth treating as a pattern, not three unrelated bugs.

**Fix, in order of preference:**
1. **Minimal, safe fix now:** in `sidebar.js`'s navigation handler, after
   swapping the content, explicitly detect and re-inject the destination
   page's page-specific `<script>` tags (a small allowlist keyed by page,
   or diff the old/new script `src` lists and load whichever are missing with
   a dynamically created `<script>` element, which *does* execute).
2. **Longer-term (not in this window):** consider whether the hand-rolled PJAX
   router is worth keeping given `frontend/js/core/router.js` already exists
   as an empty file — suggesting a real router was planned. Flagging for a
   future cleanup, not urgent.

**Verification:** from Dashboard, click "Historial" via the sidebar (not a
direct URL load) → export buttons must be visible and functional. Repeat
navigating Dashboard → Calendar → Historial → Admin → Historial, since the bug
is about *which* scripts have loaded so far in the session.

### #4. Modal closes on outside click, secretary loses her work

**Where:** confirmed in exactly two places:
[`reservation-modal.js:500`](../../frontend/js/components/reservation-modal.js:500)
and the user-management modal in
[`admin-page.js:420`](../../frontend/js/pages/admin-page.js:420) (the external
contact info modal at `admin-page.js:124` has the same pattern too).

**Fix:** remove the `overlay.addEventListener('click', e => { if (e.target ===
overlay) close(); })` listener from these components. Closing stays possible
only via the explicit "X", "Cancelar", and (for the reservation form) after a
successful "Guardar reservación". Leave the `Escape` key behavior as-is for
now — flag to the secretary that pressing Escape still closes the form, and
remove that too in the same change if she'd rather it not.

**Should we also change this in the two other places with the same pattern**
(`change-password-modal.js`, `history-modification-request-modal.js`)? Not
asked for, but it's the same inconsistency. Recommend doing it for
consistency since it's a one-line change per file and the same risk profile,
but confirm with the secretary rather than assuming.

**Verification:** open the reservation form and the user modal, fill in some
data, click outside → the modal must stay open with the data intact. Confirm
"X" and "Cancelar" still close it, and confirm saving still closes it too.

### #6a. Recurring reservations: false error, calendar doesn't refresh

**Root cause, confirmed:** in
[`recurring.js`](../../frontend/js/modules/recurring.js), `Recurring.save()`
successfully creates the recurring group and every reservation instance, then
calls:

```js
Notifications.onReservationCreated({ ...savedInstances[0], _batchCount: savedCount });
```

But [`notifications.js`](../../frontend/js/modules/notifications.js) only
exports `{ getLog }` — `onReservationCreated` **does not exist**. This throws
*after* every reservation row is already committed, the exception is caught by
`_saveRecurring`'s `catch` block in `reservation-modal.js`, which shows "Error
al crear la serie" and returns *without* calling `_onSaved()` or `close()` —
so the modal never closes and the calendar never re-renders, even though the
whole series was created correctly. This exactly matches the report.

**Fix, implemented:** removed the dead `Notifications.onReservationCreated(...)`
call. There was no other reference to it anywhere in the codebase, confirming
it was leftover from a renamed/removed feature rather than something to
reimplement.

**Verified live** (browser automation against the local dev stack, 2026-09-21):
created a 4-occurrence recurring reservation end to end. No error shown, a
success toast appeared, the modal closed, and all 4 rows were confirmed
persisted via the API — all without a manual page refresh. Test rows deleted
afterward.

---

## Phase 2 — completed (2026-09-22)

Implemented, verified live via browser automation against the local dev
stack, and committed on `fix/phase-2-ux-and-bugs`. Not yet merged or deployed.

**Correction to the #3 root-cause writeup above.** Live testing showed the
actual cause was simpler than "scripts inserted via `innerHTML` never
execute": the router's existing script-injection logic was already correct
and did load `export.js` and its dependencies. The real bug was structural:
`#export-btn-group` (and the role badge, and Dashboard's tutorial button) live
inside `<header class="topbar">`, **outside** `<main class="page-content">`.
The router only ever swapped `.page-content` and `.topbar__title` — a page's
own topbar controls were only ever correct if you happened to reach it via a
hard reload. Fixed by also swapping `.topbar__actions` on every navigation.

**Important discovery, affects every future frontend deploy, not just this
one.** Both production and this local image serve `.js`/`.css` with
`Cache-Control: public, max-age=31536000, immutable` (see
[DEPLOYMENT.md observation 12](../DEPLOYMENT.md#7-observations--recommendations)),
keyed only by the `?v=6` query string every `<script>`/`<link>` tag carries.
A browser that already loaded a page keeps that exact JS forever — not just
until next visit, until the cache entry itself expires (a year) — regardless
of reloads, hard reloads, or new deploys, unless the query string changes.
**This was bumped to `?v=7` across every `frontend/*.html` file as part of
this fix**, and needs bumping again on every future frontend change, or users
who already loaded the app simply never receive the fix. Worth automating
(e.g. a build-time hash) rather than relying on someone remembering to bump a
number by hand — flagging as a follow-up, not doing it now to keep this phase
small.

---

## Phase 3 — Medium-risk, needs live reproduction

These two need to be reproduced with the app running before writing the fix,
because the evidence is not as conclusive as Phase 2's.

### #2. Dashboard stops responding to clicks after one reservation

**Working hypothesis (not yet confirmed by running the app):** in
[`calendar-week.js`](../../frontend/js/components/calendar-week.js:610-615),
the selection listeners (`mousedown`, `mousemove` on the container, `mouseup`
on `document`) are attached inside the function that runs on every
`Calendar.renderWeek()` call, and nothing removes the *previous* set of
listeners first. Creating a reservation triggers a re-render (to show the new
block), which re-attaches a second copy of each listener onto the same
long-lived container node. Two `mousedown` handlers firing on the same click
can each toggle internal selection state, net effect being that the drag
gesture that used to start a selection stops registering — which matches
"nothing gets selected until I refresh the page" (a refresh discards the
duplicated listeners along with everything else).

**This needs confirmation before fixing**, not just a fix: reproduce it with
DevTools open, count listeners on the container after 1 vs. 2 reservations
(`getEventListeners(container)` in the console), and confirm the hypothesis
before touching code. If confirmed, the fix is to store references to the
bound handler functions and call `removeEventListener` for each before
`render()` re-attaches them (or switch to binding these listeners once, at
`init()`, on a container element that is never replaced — the more durable
fix, but slightly bigger).

**Also check while reproducing:** whether this is the same underlying issue as
#3/#6a's script-re-execution problem, or genuinely a separate listener-leak
bug. They look different (this one is about listeners on a node that persists
across renders, not about scripts never loading), but confirm rather than
assume.

**Verification:** create three reservations in a row via drag-select in week
view, with no manual page refresh between them; each one must be selectable
and creatable normally.

### #5. Allow booking some Saturdays

**Current rule, confirmed:** both
[`calendar-grid.js:108`](../../frontend/js/components/calendar-grid.js:108)
and
[`calendar-week.js:242`](../../frontend/js/components/calendar-week.js:242)
treat Saturday and Sunday identically as always-blocked
(`dayOfWeek === 0 || dayOfWeek === 6`). This is **frontend-only** — no
backend route rejects a Saturday date, so relaxing the frontend rule is
suf­ficient; nothing in the API needs to change for this to work.

**Decision needed:** the request is "some Saturdays," not "all Saturdays," so
a blanket toggle isn't quite right. Two reasonable designs:

- **Option A (recommended, smaller):** keep Saturdays closed by default, and
  let a secretary open a *specific* Saturday the same way holidays/closures
  are already managed today — reuse the existing `calendar_events` mechanism
  with one more type (e.g. `special_opening`) that, when present for a date,
  makes that Saturday bookable. This mirrors how the `evento` type already
  works for the opposite case (tagging a day without blocking it). Small
  schema touch: extend the `calendar_events.type` check constraint via a new
  migration file, plus the small frontend/backend logic to treat that type as
  "opens this Saturday" instead of "closes this day."
- **Option B (simpler, less flexible):** just remove Saturday from the
  hardcoded block entirely, leaving only Sunday closed, and rely on the
  existing "cierre institucional" (closure) mechanism to close specific
  Saturdays the university doesn't work, instead of opening specific ones.
  Zero schema change, one-line-per-file fix, but changes the *default* for
  every Saturday, which may not be what's wanted.

Confirm which default the secretary wants (closed-by-default-with-exceptions,
or open-by-default-with-exceptions) before coding — this is a five-minute
question, not a design meeting.

**Verification:** whichever option, confirm a regular Saturday and Sunday
behave as expected, an explicitly-opened (or explicitly-closed) Saturday
behaves as expected, and the admin UI for managing holidays/closures still
works for weekdays.

---

## Phase 4 — Needs a short design discussion before any code

### #6b. Recurrence UX: "Ocurrencias" wording, add a "Semester" option

Not a bug — a product decision, exactly as flagged in the request. Suggest a
15–20 minute conversation with the secretary covering:

1. **"Ocurrencias" rewording.** Candidates: "Número de repeticiones" or
   "¿Cuántas veces se repite?". Confirm which reads clearest to her.
2. **Semester recurrence.** Since semester start/end dates change every year,
   a fixed "Semestre" option in the dropdown (like today's Semanal/Quincenal/
   Mensual) would need re-entering dates every term anyway. Two shapes to
   choose between in the discussion:
   - **A configurable "current semester" range**, set once per term by a
     super admin (two dates, stored somewhere an admin can edit — a small new
     settings entry), that the recurrence form then offers as a one-click
     "hasta fin de semestre" end-date shortcut. Reuses the existing end-date
     field; low effort.
   - **A fully custom end-date picker**, already partially possible today via
     the existing `endDate` field in the recurrence form — if the real ask is
     just "let me type an end date instead of a count," this may already be
     closer to solved than it looks, and the fix is making that option more
     discoverable in the UI rather than building something new.

**Do not start building until this conversation happens** — this is the one
item where writing code first is more likely to waste time than save it.

---

## Phase 5 — Workflow change (its own branch, careful rollout)

### #7. Remove the "Solicitudes de cambio" approval step

**Good news found during review: this does not need a database migration.**
The attribution mechanism the secretary is asking for ("just say who made the
change, like the history") already exists and is already used for the
super-admin override path:

- `reservations.created_by` and `reservations.last_modified_by` columns
  already exist and are already set on every update
  ([`reservations.js:483`](../../backend/routes/reservations.js:483)).
- `audit_log` already records every create/update/cancel with the acting
  user's id.
- The *only* thing stopping a non-owner secretary from editing or cancelling
  someone else's reservation today is one authorization check, repeated in
  three places in
  [`backend/routes/reservations.js`](../../backend/routes/reservations.js):

  ```js
  const isOwner = existing.rows[0].created_by === req.user.id;
  if (!req.user.isAdmin && !isOwner) {
    return res.status(403).json({ error: 'No puedes modificar/cancelar una reservación de otra secretaria' });
  }
  ```

  in `PUT /:id`, `DELETE /:id`, and `DELETE /bulk`. This is the whole reason
  "Solicitudes de cambio" exists as a workaround. Removing (or relaxing) this
  check for the `secretaria` role is the actual fix — everything downstream
  (attribution, notification emails to the original creator when someone else
  edits their booking) is already built and already runs, because it already
  runs for the super-admin case today.

**What changes, concretely:**
1. **Backend:** in `PUT /:id`, `DELETE /:id`, `DELETE /bulk`, drop the
   ownership check for the `secretaria` role (keep `requireRole('secretaria')`
   — academics still cannot edit/cancel). The existing
   "notify the original creator when someone else changes it" emails already
   fire correctly for this case (they were written generically, keyed off
   `isOwner`, not off `isAdmin` specifically) — verify this while testing
   rather than assuming.
2. **Backend query:** `GET /api/reservations` and `GET /api/reservations/week`
   currently join `creator_name` only. Add a second `LEFT JOIN users` for
   `last_modified_by` so the frontend can show "última modificación por" —
   this is a query change, not a schema change.
3. **Frontend, History page:** show a "Modificado por" column/detail using
   the new field, so the secretary can see who touched a reservation last —
   this is literally what was asked for.
4. **Frontend:** remove the "Solicitar cambio" entry points (the button in the
   reservation detail popup, the History page's request UI) so the workflow
   is no longer offered.
5. **Do *not* delete the `modification_requests` table, its migration, or its
   backend routes in this phase.** Leave the code in place but unreached.
   This keeps the change reversible with a one-line revert if something is
   missed, and avoids a destructive schema change under deadline pressure.
   Proposing an actual `DROP TABLE` migration as a *separate*, later, unhurried
   cleanup once the team is confident nothing depends on it (e.g. no pending
   requests exist, and a term has passed without anyone asking for the old
   approval flow back).

**Open question to confirm before building:** should *any* secretary be able
to edit/cancel *any* reservation (fully flat), or should there still be some
limit (e.g., not touching another department's reservation without at least a
notification, which already happens via email)? The request reads as "fully
flat, just log who did it," and that's what this plan implements — flagging
it explicitly in case that's not quite right.

**Rollout:**
1. Build on `fix/direct-reservation-edit`, test locally against a copy of
   production data if practical, or against fresh seed data otherwise.
2. **Backup the production database first**
   ([RUNBOOK](../RUNBOOK.md#backup-the-database)) — this phase changes who
   can write to `reservations`, which is worth being able to undo instantly
   even though no schema changes.
3. Deploy, then have the secretary who reported this test it directly, before
   telling the rest of the team it's live.
4. Watch `audit_log` and the notification emails for a few days to confirm
   attribution is landing correctly.

---

## Suggested order and timing

Given the professor evaluation is imminent:

1. **Phase 1 (security) — today, alone.** Trivial, zero UI risk, highest
   impact if left unfixed.
2. **Phase 2 (four low-risk fixes) — today or tomorrow, one PR.** All four
   have confirmed causes; the main time cost is the manual regression pass
   after, not the coding.
3. **Phase 3 (#2, #5) — this week, after Phase 2 is confirmed stable.** #2
   needs a live reproduction session; #5 needs a five-minute product answer
   first.
4. **Phase 4 (#6b discussion) — schedule the conversation this week**, build
   whenever after that; it's UX polish, not urgent enough to risk touching
   right before an evaluation.
5. **Phase 5 (#7) — after the professor's evaluation, not before**, unless the
   secretary's workflow is actively blocking her *before* that date, in which
   case do it with extra care (backup, off-hours deploy, direct testing with
   her) rather than skip it. It is lower-risk than it sounds, but it is still
   the one item that changes who can write to production data, and that is
   not something to ship five minutes before grading starts.

## After each phase

- Update this table's "Phase" column status (or close the GitHub Issue).
- Add one line to [DEPLOYMENT.md's change history](../DEPLOYMENT.md#change-history).
- Tell the secretary what changed in her own words, not the technical ones —
  she's the one who will notice if it actually solved her problem.
