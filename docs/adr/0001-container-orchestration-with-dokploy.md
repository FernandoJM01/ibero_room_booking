# ADR 0001: Container orchestration with Dokploy

- **Date:** 2026-09-21
- **Deciders:** Project team

> Rationale marked *(inferred)* was derived from the observed configuration and should be confirmed by the team.

## Status

Accepted

## Context

The application is three containers (Nginx frontend, Node.js API, PostgreSQL)
that must run on a single university-provided Ubuntu 24.04 server,
`reservadeii`, and be redeployable from GitHub by students without deep
operations experience.

Observed on the server (2026-09-21):

- Docker Engine 28.5.0 in Swarm mode, one node (Leader and Manager).
- Dokploy v0.30.2 runs as a Swarm service with its own PostgreSQL 16, and manages
  Traefik (`dokploy-traefik`, v3.6.7).
- The application is split into three Dokploy-managed Swarm services
  (`reservationsweb`, `reservationsapi`, `iberoreservationsdb`), attached to
  the overlay network `dokploy-network`, with no published ports.
- Web and API are two Dokploy applications that clone the same GitHub repository
  (branch `main`) and build images locally as `:latest`. Environment variables
  are stored in Dokploy.
- The repository's `docker-compose.yml` exists in the clones but is not used by
  production.

## Decision

Use **Dokploy** on a single-node Docker Swarm to build, deploy and configure the
services, instead of running the compose file by hand. Application and database
are separate services so a code deploy never touches the database.

*(inferred)* Reasons: a web UI for deploys, environment variables and logs;
Git-based builds; built-in Traefik integration; rolling updates with
`start-first` and automatic restarts.

Alternatives visible in the repository: running `docker compose up` directly on
the server (simpler, but no UI, no managed routing, manual deploys).

## Consequences

- **Positive:** deploys are one click; rolling `start-first` updates; restart
  policy `any` with a 5 s delay brought the API back on its own after the
  2026-09-18 reboot; the DB has its own persistent volume and is untouched by
  deploys.
- **Negative:** images are local `:latest` builds with no registry, so rollback
  is a rebuild of an earlier commit. Dokploy adds an admin UI on port 3000 and
  Swarm ports (2377, 7946) that must be protected. The production DB is
  initialised manually rather than by the compose mechanism used in local
  development (see DEPLOYMENT.md section 4).
- **Neutral:** production differs from local development (Swarm services and
  PostgreSQL 18 in production, compose and PostgreSQL 16 locally).
