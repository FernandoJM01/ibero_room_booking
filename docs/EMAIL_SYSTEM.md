# EMAIL_SYSTEM.md

## Audience
Developers

## Purpose
Explain the complete technical architecture of the current email system.

## Overview
The email system is a synchronous, monolithic module responsible for notifying users and administrators of events within the application. It relies entirely on Node.js and Nodemailer, directly dispatching emails from the Express.js route controllers. There is no background worker or external queue; the HTTP request thread hands off the email dispatch to the Nodemailer transporter, which executes it asynchronously but in-memory.

## Current Architecture

The architecture consists of standard Express routes invoking a centralized Mailer utility.

*   **Modules & Services:** `backend/utils/mailer.js` acts as the sole email service. Route controllers (`reservations.js`, `auth.js`, `users.js`, `modification-requests.js`, `diagnostics.js`) act as the business logic layer that triggers it.
*   **Dependencies:** `nodemailer` is the only external dependency.
*   **SMTP Initialization:** Occurs once on server startup. The `mailer.js` file reads environment variables synchronously. Email is enabled only when `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are all set; then it creates the Nodemailer transport (implicit TLS when `SMTP_PORT` is `465`; otherwise a plain connection upgraded with STARTTLS when the server offers it). If any is missing, it gracefully degrades to a disabled state.
*   **Delivery log:** every attempt, including skipped ones, is written to the `notification_logs` table with status `sent`, `failed` or `skipped` (the "Notificaciones" tab of the admin panel shows it). Records are purged by the retention job after `DATA_RETENTION_MONTHS`.
*   **Email Flow:** The routes construct data objects, pass them to template functions in `mailer.js` to generate subject and HTML, and finally pass the output to `sendEmail`.
*   **Template Flow:** Templates are purely synchronous JavaScript functions returning string literals.

### Architecture Diagram
```text
User Action (e.g., POST /api/reservations)
      │
      ▼
Express Route Controller (reservations.js)
      │
      ▼
Template Function (mailer.js - e.g., reservationCreatedEmail())
      │
      ▼
Email Dispatcher (mailer.js - sendEmail())
      │
      ▼
Nodemailer Transporter
      │
      ▼
SMTP Provider
      │
      ▼
Recipient
```

## Existing Components

### 1. `backend/utils/mailer.js`
*   **Purpose:** Centralized email transport and template repository.
*   **Responsibilities:** Initializes SMTP connection, formats HTML layouts, escapes user data to prevent XSS, and attempts to send the email payload.
*   **Dependencies:** `nodemailer`, `dotenv` (via `server.js` startup).
*   **Current State:** Fully functional, but handles templates and transport in the same file.

### 2. `backend/routes/reservations.js`
*   **Purpose:** Handles reservation CRUD operations.
*   **Responsibilities:** Dispatches reservation-related emails upon successful database queries.
*   **Current State:** Functional. Executes `sendEmail` as a fire-and-forget asynchronous call (without `await`), meaning HTTP responses aren't blocked, but failures cannot be reported to the user. The reservation passed to the templates is re-read with `fetchWithNames()` so the room name and responsible name are available (the "Sala" row appears only when the reservation has a room).

### 3. `backend/routes/auth.js`
*   **Purpose:** Authentication and password recovery.
*   **Responsibilities:** Dispatches password reset links (valid 60 minutes), "password changed" alerts and the SMTP test email (`POST /api/auth/test-email`).
*   **Current State:** Functional. 

### 4. `backend/routes/users.js`
*   **Purpose:** User management by admins.
*   **Responsibilities:** Dispatches welcome emails to newly created users, "password changed" alerts, and account deactivation/reactivation notices.
*   **Current State:** Functional.

### 5. `backend/routes/modification-requests.js`
*   **Purpose:** Handles schedule changes requested by users.
*   **Responsibilities:** Dispatches workflow emails to admins (pending request) and users (approved/rejected).
*   **Current State:** The API routes and templates still exist, but the "Solicitudes" screens were removed from the interface (any secretary can now edit or cancel any reservation directly), so in practice these emails are not triggered. See `docs/changes/2026-09-22-secretary-feedback.md` #7.

### 6. `backend/routes/diagnostics.js`
*   **Purpose:** Super-administrator SMTP diagnostics (`GET/POST /api/diagnostics/smtp`).
*   **Responsibilities:** Verifies the SMTP connection and sends a test email, classifying failures (`authentication_failed`, `timeout`, `connection_refused`, `host_unreachable`, `recipient_or_sender_rejected`, `tls_error`).

## SMTP Configuration

The system requires the following environment variables (found in `.env`):

*   `SMTP_HOST`: The FQDN of the mail server (e.g., `smtp.office365.com`).
*   `SMTP_PORT`: The connection port (`587` for TLS, `465` for SSL).
*   `SMTP_USER`: The authentication username (usually the email address).
*   `SMTP_PASSWORD`: The password or App Password for the SMTP account.
*   `SMTP_FROM`: The address used in the `From:` header. Must match `SMTP_USER` to prevent spoofing rejections by strict providers.

## Email Flow

Emails are triggered immediately after a successful database `UPDATE` or `INSERT`.

*   **Reservation created:** `POST /api/reservations` (one email) and `POST /api/reservations/multi` (one email per interval) -> confirmation to the responsible person.
*   **Recurring series created:** the client saves one reservation per date with `POST /api/reservations` (these send **no** e-mail when `recurring_group` is set) and then calls `POST /api/reservations/recurring-group/:id/notify` **once**, which sends **one summary e-mail** listing every date (`recurringSeriesCreatedEmail`). It only covers active reservations of that group created by the caller in the last 15 minutes. A series of one date gets the normal confirmation.
*   **Reservation updated:** `PUT /api/reservations/:id` -> update email to the responsible person when a relevant field changed (including the room).
*   **Reservation cancelled:** `DELETE /api/reservations/:id` -> cancellation email to the responsible person. `DELETE /api/reservations/bulk` sends **one e-mail per recipient**: the usual message for a single reservation, or one summary (`reservationsCancelledSummaryEmail`) when several of the same person are cancelled together (a whole series).
*   **Account invitation (one-off, data migration):** `node scripts/send_migration_welcome.js` -> one e-mail per imported person with a create-password link and their reservations (`accountInvitationEmail`); see [DATA_MIGRATION §4b](DATA_MIGRATION.md#4b-inviting-the-imported-people-one-e-mail-each).
*   **Edited or cancelled by someone else:** the same `PUT` / `DELETE` also notify the secretary who created the reservation when a different user made the change (`reservationAdminModifiedEmail` / `reservationAdminCancelledEmail`).
*   **Modification request submitted / approved / rejected:** `POST /api/modification-requests`, `PATCH /api/modification-requests/:id/approve` and `/reject` (dormant, see above).
*   **Password reset:** `POST /api/auth/forgot-password` (link valid 60 minutes) and `POST /api/auth/reset-password` ("password changed" alert).
*   **Password changed:** `PUT /api/auth/change-password` and `PUT /api/users/:id` when a password is set.
*   **User created / deactivated / reactivated:** `POST /api/users`, `PATCH /api/users/:id/deactivate` and `/activate`.
*   **SMTP test:** `POST /api/auth/test-email` and `POST /api/diagnostics/smtp`.

*Note: Automated time-based emails (e.g., Reservation Reminders) are entirely missing because there is no cron job or scheduling system implemented.*

## Current Templates

All templates reside inside `backend/utils/mailer.js`.
*   **Generation:** They are generated using pure JavaScript template literals (backticks).
*   **HTML:** HTML structure and inline CSS are hardcoded directly into the JavaScript strings.
*   **Reusability:** Highly coupled. There is a single `_layout(headerColor, title, body)` and `_reservationTable(reservation)` function, but beyond that, branding is hardcoded into the layout strings.
*   **Localization:** Not possible without rewriting the JavaScript logic. All strings are hardcoded in Spanish.

## Maintainability Analysis

"Hardcoded templates" in this project means that the HTML, CSS, and copy (text) are embedded directly inside JavaScript functions in `mailer.js` (e.g., `<div style="font-family:sans-serif;max-width:520px..."><h2 style="color:${headerColor};">${title}</h2>...`). 

*   **HTML Embedding:** Because HTML is embedded in JS strings, developers lose IDE syntax highlighting, formatting, and linting for the HTML/CSS itself.
*   **Maintenance Difficulty:** Making a design change requires a backend engineer to edit core utility logic rather than a frontend designer editing a standalone HTML file. 
*   **Branding Changes:** To update a logo, color palette, or footer, the engineer must hunt through JavaScript string concatenations.
*   **Localization:** If the system ever needs an English version, the codebase would require duplicated JS functions (e.g., `welcomeEmailEN()`) or complex inline ternary operators, leading to unreadable code.

## Strengths
*   **Zero external infrastructure dependencies:** Because it doesn't rely on Redis or RabbitMQ, it is extremely easy to deploy.
*   **Security:** Variables are cleanly sanitized using a custom `_esc()` function before being injected into HTML, mitigating XSS risks within email clients.
*   **Graceful degradation:** If `.env` lacks SMTP credentials, the application logs the skipped email and continues functioning rather than crashing.

## Weaknesses
*   **Fire-and-forget dispatch:** Emails are dispatched asynchronously. If the SMTP server drops the connection, the error is logged to `stdout`, but the system never retries, and the user is never notified of the failure.
*   **No queue:** High traffic bursts could choke the Express server's memory since email promises are held in the event loop.
*   **No plain-text fallback:** Emails are exclusively HTML, which increases the likelihood of being flagged as spam by strict corporate firewalls.

## Risks
*   **Silent Failures:** If Microsoft 365 or Gmail rotates their SSL certificates or throttling occurs, emails will silently fail in production. Neither admins nor users will know.
*   **Server Hangs:** the transport sets no explicit timeouts, so Nodemailer's defaults apply (about 2 minutes to connect, 30 seconds for the greeting, 10 minutes of socket inactivity). If the SMTP provider is slow, pending promises stack up in the event loop, which can cause latency spikes. Setting `connectionTimeout`, `greetingTimeout` and `socketTimeout` in `createTransport` would bound this.

## Production Readiness
**Not fully production-ready.** While functional for low-volume, local setups, an enterprise application requires guaranteed delivery. Without a job queue (like BullMQ), persistent retry logic, and an administrative view of email failures, the current implementation risks critical business communications (like password resets) being silently dropped.
