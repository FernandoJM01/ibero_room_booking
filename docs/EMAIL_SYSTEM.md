# EMAIL_SYSTEM.md

## Audience
Developers

## Purpose
Explain the complete technical architecture of the current email system.

## Overview
The email system is a synchronous, monolithic module responsible for notifying users and administrators of events within the application. It relies entirely on Node.js and Nodemailer, directly dispatching emails from the Express.js route controllers. There is no background worker or external queue; the HTTP request thread hands off the email dispatch to the Nodemailer transporter, which executes it asynchronously but in-memory.

## Current Architecture

The architecture consists of standard Express routes invoking a centralized Mailer utility.

*   **Modules & Services:** `backend/utils/mailer.js` acts as the sole email service. Route controllers (`reservations.js`, `auth.js`, `users.js`, `modification-requests.js`) act as the business logic layer that triggers it.
*   **Dependencies:** `nodemailer` is the only external dependency.
*   **SMTP Initialization:** Occurs once on server startup. The `mailer.js` file reads environment variables synchronously. If they are present, it creates the Nodemailer transport. If missing, it gracefully degrades to a disabled state.
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
*   **Current State:** Functional. Executes `sendEmail` as a fire-and-forget asynchronous call (without `await`), meaning HTTP responses aren't blocked, but failures cannot be reported to the user.

### 3. `backend/routes/auth.js`
*   **Purpose:** Authentication and password recovery.
*   **Responsibilities:** Dispatches password reset tokens and security alerts.
*   **Current State:** Functional. 

### 4. `backend/routes/users.js`
*   **Purpose:** User management by admins.
*   **Responsibilities:** Dispatches welcome emails to newly created users and deactivation notices.
*   **Current State:** Functional.

### 5. `backend/routes/modification-requests.js`
*   **Purpose:** Handles schedule changes requested by users.
*   **Responsibilities:** Dispatches workflow emails to admins (pending request) and users (approved/rejected).
*   **Current State:** Functional.

## SMTP Configuration

The system requires the following environment variables (found in `.env`):

*   `SMTP_HOST`: The FQDN of the mail server (e.g., `smtp.office365.com`).
*   `SMTP_PORT`: The connection port (`587` for TLS, `465` for SSL).
*   `SMTP_USER`: The authentication username (usually the email address).
*   `SMTP_PASSWORD`: The password or App Password for the SMTP account.
*   `SMTP_FROM`: The address used in the `From:` header. Must match `SMTP_USER` to prevent spoofing rejections by strict providers.

## Email Flow

Emails are triggered immediately after a successful database `UPDATE` or `INSERT`.

*   **Reservation created:** Triggered instantly in `POST /api/reservations`.
*   **Reservation updated:** Triggered instantly in `PUT /api/reservations/:id`.
*   **Reservation cancelled:** Triggered instantly in `PATCH /api/reservations/:id/cancel`.
*   **Admin overridden reservation:** Triggered in `PUT /api/reservations/:id` when the modifier is an admin but the owner is a user.
*   **Modification request submitted:** Triggered in `POST /api/modification-requests`.
*   **Modification request approved/rejected:** Triggered in `POST /api/modification-requests/:id/approve` and `/reject`.
*   **Password reset:** Triggered in `POST /api/auth/request-password-reset`.
*   **User created:** Triggered in `POST /api/users`.

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
*   **Server Hangs:** `nodemailer` uses a 10-second timeout. If the SMTP provider is slow, the Node.js event loop will have pending promises stacking up, potentially leading to memory leaks or latency spikes.

## Production Readiness
**Not fully production-ready.** While functional for low-volume, local setups, an enterprise application requires guaranteed delivery. Without a job queue (like BullMQ), persistent retry logic, and an administrative view of email failures, the current implementation risks critical business communications (like password resets) being silently dropped.
