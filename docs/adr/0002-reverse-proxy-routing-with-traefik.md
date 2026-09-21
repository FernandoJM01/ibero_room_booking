# ADR 0002: Reverse proxy routing with Traefik

- **Date:** 2026-09-21
- **Deciders:** Project team

> Rationale marked *(inferred)* was derived from the observed configuration and should be confirmed by the team.

## Status

Accepted

## Context

Several hostnames must reach two internal services (web on port 80, API on port
3000) that have no published ports. Traffic reaches the server through a Dev
Tunnel, and the Cloudflare Worker sets the `Host` header to the tunnel's
hostname.

Observed on the server:

- Traefik v3.6.7, deployed and managed by Dokploy, listening on 80 and 443.
- Providers: `swarm`, `docker` and `file`. Services carry no Traefik labels;
  Dokploy writes one file per application under
  `/etc/dokploy/traefik/dynamic/`.
- All application routers use the `web` (HTTP) entrypoint only. `acme.json` is
  empty, so no certificate was ever issued.
- On the tunnel host, `/api` goes to the API (port 3000) and everything else to
  the web service (port 80). The Nginx inside the web image also proxies `/api/`
  to the API.
- Some routes are historical (`reservas.local` pointing at port 8080,
  `localhost`, and the host of the retired tunnel). The ngrok routes were removed
  on 2026-09-21. When the tunnel was recreated on 2026-09-21, routes for its new
  host were added alongside the old ones.

## Decision

Use **Traefik with Dokploy's file provider** to route by `Host` and `PathPrefix`,
and terminate TLS outside the server (at the Dev Tunnel and Cloudflare) rather
than in Traefik.

*(inferred)* Reasons: it is Dokploy's default proxy, and a domain entry in the
Dokploy UI generates the routing file automatically.

## Consequences

- **Positive:** routing for new hostnames is added from the UI; services stay
  unexposed to the host network; `/api` on the tunnel host bypasses Nginx.
- **Negative:** routing depends on the exact `Host` header, so changing the
  tunnel URL breaks routing until the routes are updated. HTTP only between the
  tunnel and Traefik, and no certificates on the server. Stale routes add
  confusion. The Traefik dashboard is enabled (`api.insecure`), though not
  published.
- **Neutral:** the Nginx upstream is also hardcoded in the currently deployed
  commit (later commits make it configurable through `BACKEND_URL`).
