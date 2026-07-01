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
The application provides an built-in **Email Diagnostics** panel in the Administration section to verify SMTP settings.

### Diagnostics Interface
1. Log in as a **Super Administrator**.
2. Navigate to the **Notificaciones** (Notifications) tab in the admin panel.
3. Check the status indicator:
   - **🟢 Servicio de correo en funcionamiento**: SMTP credentials are present and connection/authentication succeeded. The system is ready to send notifications.
   - **🟡 Credenciales o conexión inválida**: The system found configuration settings, but the verification test failed (e.g. wrong password, server unreachable, or expired credentials).
   - **🔴 Servicio de correo no configurado**: The server is missing one or more required SMTP environment variables.
4. Click **Enviar correo de prueba** (Send Test Email) to test delivery manually.
5. Enter a recipient email address to verify delivery and view detailed errors.

> [!NOTE]
> The test email utilizes the official institutional layout with the university logo and signature. This ensures that stricter email servers (like Gmail) do not flag the diagnostic email as spam or phishing.

## Environment Reloading (Docker Setup)
Because this application runs inside Docker containers, editing the `.env` file on your host machine will **not** dynamically update the running Node.js process. The variables are read when the container is built/booted.

To apply changes made to your `.env` file:
1. Open the `.env` file in the root directory and update the SMTP fields.
2. Run the following command in the terminal from the project's root folder:
   ```bash
   docker compose up -d --force-recreate backend
   ```
   *Note: Using a standard `docker compose restart backend` does not re-read or update changed environment variables inside running containers. You must force container recreation.*
3. Once the backend container is running again, refresh the browser admin page to see the updated status.

## Troubleshooting

### Authentication failed / Incorrect Password
*   **Symptoms:** Emails are not arriving. The UI error modal shows `authentication_failed` or SMTP logs show `535 5.7.8 Username and Password not accepted`.
*   **Causes:** The password is wrong, or the account requires an "App Password" because MFA is enabled.
*   **Action:** Generate an App Password in your Microsoft/Google account settings, update `SMTP_PASSWORD` in `.env`, and restart the Docker container.

### Connection timeout / TLS error
*   **Symptoms:** UI shows `timeout` or `tls_error`.
*   **Causes:** The port is incorrect, or a corporate firewall is blocking outbound traffic on port 587/465.
*   **Action:** Ensure your server's firewall allows outbound traffic on the specified `SMTP_PORT`.

### Incorrect Sender Address / Recipient Rejected
*   **Symptoms:** UI shows `recipient_or_sender_rejected` (error code `554` or `550`).
*   **Causes:** `SMTP_FROM` does not match the authenticated `SMTP_USER` mailbox. Strict corporate providers (especially Microsoft 365 / Office 365) prohibit sending emails "on behalf of" another address without specific delegate permissions.
*   **Action:** Ensure `SMTP_FROM` and `SMTP_USER` are identical.

## Operational Recommendations
*   **App Passwords:** Always use App Passwords rather than standard user passwords to prevent security breaches if the server is compromised.
*   **Container Restarting:** Remember that if you modify the SMTP settings, you must restart the Docker container for the changes to apply.
*   **Gmail Delivery:** The test email does not display the server host or port in its HTML body to prevent automated security filters (like Gmail's) from blocking the message as potential port-scanning activity.

