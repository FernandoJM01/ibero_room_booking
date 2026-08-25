# AI Agent Constraints & System Rules

## Data Retention and Privacy Policy
1. **18-Month Rule:** This project enforces a strict 1.5 year (18 months) data retention policy.
2. **Access Restriction:** Personal/user data must only be accessed while it is within the project's approved retention period.
3. **Do Not Retrieve Old Data:** Do not retrieve, expose, or rely on records (e.g. reservations, audit logs, modification requests, notification logs) that have exceeded the 18-month retention period.
4. **Follow Architecture:** The backend application explicitly deletes old records automatically via `backend/utils/retentionJob.js`. If you are modifying the database or writing reports, respect this policy by filtering out data older than 18 months natively.
