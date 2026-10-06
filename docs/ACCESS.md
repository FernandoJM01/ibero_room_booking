# Accounts and Access Register

Which accounts and credentials keep IberoReservations running, what each one is
used for, and who is responsible for it. For *where each piece of configuration is
stored* (files, Dokploy, Traefik, Cloudflare), see
[SERVER_CONFIGURATION](SERVER_CONFIGURATION.md). Its purpose is continuity: when someone
graduates or leaves, the team can see what must be transferred.

> **Never put secrets in this file or anywhere in the repository:** no
> passwords, tokens, API keys, recovery codes or personal email addresses. Refer
> to roles and to where the secret is stored. Real values belong in the team's
> password manager. Fill every `TBD` before delivery.

## Register

| System | Used for | Account type / owner (role) | Credentials stored in | Recovery / backup owner | Notes |
| ------ | -------- | --------------------------- | --------------------- | ----------------------- | ----- |
| Server `reservadeii` (SSH) | Operating the host, `sudo` | Personal account `acardena`, via jump host `antares.dci.uia.mx` | TBD | TBD | Institutional server; changes to network or firewall go through university IT |
| Dokploy admin UI | Deploys, domains, environment variables | Account **`antonio.cardena@ibero.mx`** (login used so far). Password: **not recorded here**; it is temporary and must be changed at first use | Team password manager | TBD | Reached through an SSH tunnel to port 3000 |
| Microsoft account for the Dev Tunnel | Owns tunnel `ibero-reservas.usw3`; its login is cached for user `acardena` | **`p18731@correo.uia.mx`** (single owner; tunnels cannot be transferred; the same account as Cloudflare) | TBD | TBD | Single point of failure, see [DEPLOYMENT.md](DEPLOYMENT.md#account-dependencies) |
| Cloudflare account | Worker `plain-glitter-53dd`, DNS zone `deii-salas.uk` | **`p18731@correo.uia.mx`** (single administrator; the same account as the Dev Tunnel) | TBD | TBD | Add teammates under Manage Account, Members |
| Domain registrar for `deii-salas.uk` | Domain renewal and nameservers | TBD | TBD | TBD | Registrar and renewal date not yet documented |
| GitHub repository | Source, deploys pulled by Dokploy | Repository `FernandoJM01/ibero_room_booking` | TBD | TBD | Consider an organisation or additional owners |
| SMTP mailbox | Outgoing email from the API (`SMTP_*`) | TBD | Dokploy environment | TBD | See [SMTP_ADMIN_GUIDE](SMTP_ADMIN_GUIDE.md) |
| AI provider key (optional) | AI assistant, currently hidden | TBD | Dokploy environment | TBD | Blank disables the feature |
| PostgreSQL credentials | Application database | Service credentials (`DB_*`, `POSTGRES_*`) | Dokploy environment | TBD | Not needed by people day to day |
| Server local accounts | `acardena` (uid 1001, sudo) and **`admlocal`** (uid 1000, sudo), found on 2026-10-06; no SSH keys installed, password login enabled | Team password manager | TBD | Owner of `admlocal` is not recorded |
| Dokploy internal secrets | Dokploy's own database and auth secrets | Docker secrets on the server | TBD | Not needed by people day to day |
| Microsoft login cache for the Dev Tunnel | The token of the Microsoft account above is cached in `/home/acardena/DevTunnels/` (not the password) | Same single owner | TBD | Verified 2026-10-06; see [SERVER_CONFIGURATION](SERVER_CONFIGURATION.md) |
| Application super administrator | Managing users in the app | Seeded default account | Team password manager | TBD | Default password from the seed must be changed |

## Rules

- **Least privilege:** use personal accounts for people and service credentials
  for systems; do not share personal logins.
- **At least two people** must be able to recover or administer each critical
  system (server, Dokploy, Cloudflare, domain, GitHub).
- **Rotate** any credential that was shared in chat, email or a screenshot.

## How credentials are handled (standard)

1. **One source of truth.** Real values live only in a **shared password manager** that **at
   least two named people** can open. Never in Git, chat, email, tickets or screenshots, and never
   in documents like this one, which only say *which* account exists and *where* its secret is.
2. **Handover sheet.** When access is passed on, use the blank
   [`docs/entrega/PLANTILLA_Hoja_traspaso_accesos_servidor.pdf`](entrega/PLANTILLA_Hoja_traspaso_accesos_servidor.pdf).
   It lists every system with the **password column intentionally empty**; the value is delivered
   through the password manager, by a channel different from the one that carried the username.
3. **Temporary credentials** are used once, expire, and are **changed at first login**. Record the
   delivery date, never the value.
4. **Prefer keys and MFA to passwords.** SSH with keys; two-step verification on Microsoft, Cloudflare,
   GitHub and the domain registrar.
5. **Personal accounts for people, service credentials for systems.** Nobody shares a personal login.
   Service secrets (`JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASSWORD`, `AI_API_KEY`) are set in Dokploy and
   copied to the password manager.
6. **Rotate** when a secret is exposed, when someone with access leaves, and at least yearly. Rotating
   `JWT_SECRET` signs everyone out; rotating `DB_PASSWORD` must be done in the database service and in
   the API variables together, then redeploy.
7. **If a secret leaks** (pasted in a chat, committed, in a screenshot): treat it as compromised, rotate it
   first, then clean up the place where it appeared. Deleting a Git commit does not make it safe again.
8. **Review** this register at the start of each term and before any evaluation or delivery date.

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
