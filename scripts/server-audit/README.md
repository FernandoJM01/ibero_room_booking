# server-audit

`collect.sh` produces a **read-only, secret-free inventory** of the production server `reservadeii`
(operating system, network and firewall, SSH policy, users, Docker/Swarm, Dokploy, Traefik, Dev Tunnel,
systemd, scheduled jobs, database counts and public health). It is the evidence behind
[`docs/SERVER_CONFIGURATION.md`](../../docs/SERVER_CONFIGURATION.md) and the server administrator manual.

**It changes nothing**: no restarts, no writes to system files, no changes in Docker, and the database
is only queried with `SELECT` counts (no personal data).

**It does not print secrets**: environment variables are listed by **name only**; every line also passes
through a filter that masks passwords, tokens, JWTs, password hashes, long random strings and email
addresses, and a final automatic review flags anything that still looks like a secret.
The filter is tested; read the script before running it, it is short.

```bash
# on the server, as a user with sudo
sudo bash collect.sh | tee ~/server-audit-$(date +%F).md
```

To get it onto the server without copying text: `scp -J <user>@antares.dci.uia.mx scripts/server-audit/collect.sh <user>@<server-ip>:~/`,
and to bring the report back: `scp -J <user>@antares.dci.uia.mx <user>@<server-ip>:~/server-audit-*.md .`

Review the report before sharing it. Keep it out of Git unless it is the sanitised version you are
publishing as documentation.
