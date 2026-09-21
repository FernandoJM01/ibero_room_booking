# ADR 0003: Institutional network egress restrictions

- **Date:** 2026-09-21
- **Deciders:** Project team

> Rationale marked *(inferred)* was derived from the observed configuration and should be confirmed by the team.

## Status

Accepted

## Context

The server `reservadeii` has a private address (172.16.x.x) and is reached over
SSH through the institutional jump host `antares.dci.uia.mx`. It is not
directly reachable from the internet *(inferred)*, so the site must be published
through an **outbound** connection.

Observed on the server:

- `cloudflared` is installed (`cloudflared.service`, `cloudflared-update.timer`)
  but **disabled and not running**.
- `devtunnel-reservations.service` is enabled and running, with an established
  connection to the Dev Tunnel relay.
- Outbound HTTPS works: `https://api.cloudflare.com/cdn-cgi/trace` (200),
  the tunnel URL (200) and `https://deii-salas.uk/` (200) all answered from the
  server on 2026-09-21, and the Dev Tunnel relay is reachable on 443.
- Port 7844 (tested 2026-09-21): a TCP connection to
  `region1.v2.argotunnel.com:7844` (`198.41.192.47`) **timed out** (`nc -4 -vz
  -w 5`, exit 124), which means the traffic is silently dropped. IPv6 is
  unreachable (no default route). UDP 7844 (QUIC) was not tested.

Cloudflare's tunnel client (`cloudflared`) connects outbound on port 7844.

## Decision

Treat the institutional network as allowing outbound port 443 and dropping
TCP port 7844, and therefore publish the application with a **Microsoft Dev Tunnel**
(outbound 443) instead of `cloudflared`. The disabled `cloudflared` install
stays as a documented, unused alternative.

## Consequences

- **Positive:** publishing works without any change to the institutional
  firewall or network.
- **Negative:** dependence on a third-party service (Microsoft Dev Tunnels) with
  rate limits (20 MB/s), a 30-day expiration, and a login held by one
  individual account (see the RUNBOOK procedure to change it).
- **Open item:** UDP 7844 was not tested, so `cloudflared` over QUIC is not ruled
  out. If it were open, a Cloudflare named tunnel would remove the dependence on
  Microsoft Dev Tunnels and on an individual Microsoft login.
