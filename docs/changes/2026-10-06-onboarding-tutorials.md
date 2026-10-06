# Onboarding tutorials by role (2026-10-06)

The interactive tour (`frontend/js/components/tutorial.js`) existed only for the secretaria, had 11 steps with advanced gestures
(drag, copy/cut, right-click) and described a removed feature ("solicitudes de cambio"). It is now a **basic tour per role**; the
detail lives in the manuals (`docs/manual/`).

| Role | Page | Steps |
| ---- | ---- | ----- |
| Secretaria (9) | Reservar | Welcome · side menu · choose the room · read the calendar (Mes/Semana, legend) · create a reservation · recurring series (one summary e-mail) · view, edit, cancel · holidays vs closures · Historial and e-mails |
| Académico (7) | Calendario | Welcome · choose the room · Mes/Semana · what you see («Ocupado») · detail of your reservation (read-only) · Historial · how to ask for a reservation, e-mails and password |

**How it works.** `Tutorial.start()` picks the list from `Store.getUser().role`. A target is a CSS selector; if it matches several elements
the first **visible** one is used (the room picker exists twice), and if the element is hidden or off-screen (the sidebar on a phone)
the tip is centred instead of pointing at nothing. The académico page now has the **?** button and opens the tour on first visit; the
secretaria's opens on Reservar as before.

**Shown again to everyone once:** the "already seen" key is now `sjibero_tutorial_v2`. Change it again when the tour is rewritten.

**Also fixed:** the footer wraps so **Saltar** is no longer cut off; asset version `?v=49` (see RUNBOOK, deploy step 1).

**Verified** with a headless browser on the development stack: both tours run start to finish (9 and 7 steps), close, and store the key;
phone width (390 px) centres the steps that point at the sidebar.
