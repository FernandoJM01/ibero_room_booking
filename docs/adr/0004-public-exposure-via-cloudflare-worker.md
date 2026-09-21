# ADR 0004: Public exposure via Cloudflare Worker

- **Date:** 2026-09-21
- **Deciders:** Project team

> Rationale marked *(inferred)* was derived from the observed configuration and should be confirmed by the team.

## Status

Accepted

## Context

The Dev Tunnel URL (currently `https://npbkpmwc-80.usw3.devtunnels.ms`) is not a usable
public address: it is machine-generated and can change. A stable name
(`deii-salas.uk`) is needed.

A first approach, pointing the domain straight at the tunnel through Cloudflare
with a passthrough, ran into a TLS/SNI hostname mismatch. A Cloudflare Worker
avoids it: its own `fetch()` connects to the tunnel URL, so the SNI matches
that URL.

Observed:

- The Worker rewrites every request to the tunnel URL (path and query
  preserved) and sets `Host` to the tunnel hostname. It adds no authentication,
  caching or filtering.
- Traefik matches the tunnel hostname, so the two tunnel-host routers serve
  production. The `deii-salas.uk` router is unused by this path *(inferred: left
  over from the first approach)*.
- The tunnel allows anonymous `connect`, so its URL is reachable directly,
  without the Worker.
- The Worker is `plain-glitter-53dd`, attached to `deii-salas.uk` as a Custom
  Domain, and its `workers.dev` URL is also enabled.
- The Worker and the zone belong to a single individual institutional Cloudflare
  account.

## Decision

Expose the application through a **Cloudflare Worker that proxies to the Dev
Tunnel URL**, serving the public domain `deii-salas.uk`.

## Consequences

- **Positive:** a stable public hostname and HTTPS from Cloudflare, no change to
  the university network, and no certificates to manage on the server.
- **Negative:** three third-party hops (Cloudflare, Microsoft Dev Tunnels,
  the server) that can each fail. The Worker gives no access control, and the
  tunnel URL bypasses it. The Worker must be updated whenever the tunnel URL
  changes, and the tunnel expires unless extended. The `workers.dev` URL is a
  second public entry point. Ownership of the Worker, the domain and the tunnel
  sits with individuals, which is a continuity risk.
- **Neutral:** the Worker code lives in Cloudflare, not in this repository. Its
  source is reproduced in DEPLOYMENT.md section 5, and should also be
  version-controlled.

## History

- **2026-09-21:** the tunnel was recreated under a different institutional
  account (`ibero-reservas.usw3`), which changed the public tunnel URL. The
  Worker's target was updated (it now keeps the origin in a single `ORIGIN`
  constant) and the Traefik routes for the new host were added in Dokploy. The
  change was tested end to end before the Worker was repointed, and no user-facing
  downtime was observed other than a few seconds when the systemd unit was
  restarted. This shows the Consequences above in practice: any change of tunnel
  account or URL requires coordinated updates in Dokploy, Cloudflare and the
  systemd unit.
