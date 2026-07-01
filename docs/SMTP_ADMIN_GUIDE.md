# SMTP_ADMIN_GUIDE.md

## Overview
This application uses SMTP (Simple Mail Transfer Protocol) to send automated notifications to users. Emails are used for account creation, password resets, and updates regarding reservations (creations, approvals, cancellations). Without SMTP, the system will continue to work, but users will not receive any notifications.

## Required Credentials
To configure the email system, you must provide the following variables. These typically come from your IT department or email provider (Microsoft 365, Google Workspace, etc.).

*   **SMTP_HOST:** The address of the mail server (e.g., `smtp.office365.com` or `smtp.gmail.com`).
*   **SMTP_PORT:** The port used for secure communication. Usually `587` (for TLS) or `465` (for SSL).
*   **SMTP_USER:** The email address the system will use to log in.
*   **SMTP_PASSWORD:** The password for the account. **Note:** If your organization uses Multi-Factor Authentication (MFA), you must generate an "App Password" specifically for this application. A standard password will fail.
*   **SMTP_FROM:** The email address that will appear in the "From" field. This must exactly match the `SMTP_USER`.

## Initial Configuration
1. Open the `.env` file located in the root directory of the application server.
2. Locate the `# SMTP` section.
3. Fill in the variables with your provider's details.
4. Save the `.env` file.
5. Restart the application containers (e.g., `docker compose up -d`) to load the new settings.

## Changing SMTP Providers
If you need to switch from Microsoft 365 to Google Workspace (or another provider):
1. Log into your new provider and generate an App Password.
2. Open the `.env` file on the server.
3. Update `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` with the new details.
4. Restart the Docker containers.

## Verification Checklist
Currently, the application **does not** provide an interface to verify SMTP settings. 
*   **Startup Verification:** Missing. The system does not verify credentials when turning on.
*   **Connection Testing:** Missing from the UI.
*   **Test Emails:** Missing from the UI.

To verify that your configuration works, you must manually trigger an email event in the application:
1. Log into the application.
2. Create a test reservation.
3. Check your inbox to see if the confirmation email arrived.
If it did not arrive, you must ask the system administrator to check the backend server logs for errors.

## Troubleshooting

### Authentication failed / Incorrect Password
*   **Symptoms:** Emails are not arriving. Server logs show `535 5.7.8 Username and Password not accepted`.
*   **Causes:** The password is wrong, or the account requires an "App Password" because MFA is enabled.
*   **Action:** Generate an App Password in your Microsoft/Google account settings and update `SMTP_PASSWORD`.

### Connection timeout / TLS error
*   **Symptoms:** Server logs show `ETIMEDOUT` or SSL handshake errors.
*   **Causes:** The port is incorrect, or a corporate firewall is blocking outbound traffic on port 587/465.
*   **Action:** Ensure your server's firewall allows outbound traffic on the specified `SMTP_PORT`.

### Incorrect Sender Address
*   **Symptoms:** Server logs show `554 5.2.0 STOREDRV.Submission.Exception:SendAsDeniedException`.
*   **Causes:** `SMTP_FROM` does not match `SMTP_USER`. Many corporate providers block sending emails "on behalf of" another address for security.
*   **Action:** Ensure `SMTP_FROM` and `SMTP_USER` are identical.

## Operational Recommendations
*   **App Passwords:** Always use App Passwords rather than standard user passwords to prevent security breaches if the server is compromised.
*   **Rotation:** If a credential is changed, remember to restart the server containers, as environment variables are not hot-reloaded.
*   **Logging:** Regularly monitor the backend Docker logs to catch silent email failures.
