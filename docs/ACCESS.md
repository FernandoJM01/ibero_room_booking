# Accounts and Access Register

Which accounts and credentials keep IberoReservations running, what each one is
used for, and who is responsible for it. Its purpose is continuity: when someone
graduates or leaves, the team can see what must be transferred.

> **Never put secrets in this file or anywhere in the repository:** no
> passwords, tokens, API keys, recovery codes or personal email addresses. Refer
> to roles and to where the secret is stored. Real values belong in the team's
> password manager. Fill every `TBD` before delivery.

## Register

| System | Used for | Account type / owner (role) | Credentials stored in | Recovery / backup owner | Notes |
| ------ | -------- | --------------------------- | --------------------- | ----------------------- | ----- |
| Server `reservadeii` (SSH) | Operating the host, `sudo` | Personal account `acardena`, via jump host `antares.dci.uia.mx` | TBD | TBD | Institutional server; changes to network or firewall go through university IT |
| Dokploy admin UI | Deploys, domains, environment variables | TBD (admin account) | TBD | TBD | Reached through an SSH tunnel to port 3000 |
| Microsoft account for the Dev Tunnel | Owns tunnel `ibero-reservas.usw3`; its login is cached for user `acardena` | **Individual institutional account** | TBD | TBD | Single point of failure, see [DEPLOYMENT.md](DEPLOYMENT.md#account-dependencies) |
| Cloudflare account | Worker `plain-glitter-53dd`, DNS zone `deii-salas.uk` | **Individual institutional account** | TBD | TBD | Add teammates under Manage Account, Members |
| Domain registrar for `deii-salas.uk` | Domain renewal and nameservers | TBD | TBD | TBD | Registrar and renewal date not yet documented |
| GitHub repository | Source, deploys pulled by Dokploy | Repository `FernandoJM01/ibero_room_booking` | TBD | TBD | Consider an organisation or additional owners |
| SMTP mailbox | Outgoing email from the API (`SMTP_*`) | TBD | Dokploy environment | TBD | See [SMTP_ADMIN_GUIDE](SMTP_ADMIN_GUIDE.md) |
| AI provider key (optional) | AI assistant, currently hidden | TBD | Dokploy environment | TBD | Blank disables the feature |
| PostgreSQL credentials | Application database | Service credentials (`DB_*`, `POSTGRES_*`) | Dokploy environment | TBD | Not needed by people day to day |
| Application super administrator | Managing users in the app | Seeded default account | Team password manager | TBD | Default password from the seed must be changed |

## Rules

- **Least privilege:** use personal accounts for people and service credentials
  for systems; do not share personal logins.
- **At least two people** must be able to recover or administer each critical
  system (server, Dokploy, Cloudflare, domain, GitHub).
- **Rotate** any credential that was shared in chat, email or a screenshot.

## Offboarding checklist (when a team member leaves)

1. Transfer or replace any account they own in the register above.
2. Remove their SSH key or account from the server, and their access to Dokploy,
   Cloudflare and GitHub.
3. Rotate shared credentials they knew (`JWT_SECRET`, database and SMTP
   passwords, API keys).
4. If they owned the Dev Tunnel account, follow
   [RUNBOOK: Change the account that owns the Dev Tunnel](RUNBOOK.md#change-the-account-that-owns-the-dev-tunnel).
5. Update this register and record the change in
   [DEPLOYMENT.md, change history](DEPLOYMENT.md#change-history).

## Review

Review this register at the start of each term and before any evaluation or
delivery date.
