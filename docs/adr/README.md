# Architecture Decision Records

An **Architecture Decision Record (ADR)** is a short document that captures one
significant technical decision: the situation that forced it, what was decided,
and what follows from it. ADRs give future maintainers the *why* behind the
system, not only the *what*.

## Conventions

- **File name:** `NNNN-short-title-in-kebab-case.md`, where `NNNN` is a
  zero-padded sequence number (`0001`, `0002`, ...). Numbers are never reused.
- **One decision per ADR.** Keep it to one or two pages.
- **Immutable once accepted.** Do not rewrite history. To change a decision,
  write a new ADR and mark the old one `Superseded by NNNN`.
- **Status values:** `Proposed`, `Accepted`, `Deprecated`, `Superseded by NNNN`.
- **Template:** Status, Context, Decision, Consequences.

## Index

| #    | Title                                                                              | Status   |
| ---- | ---------------------------------------------------------------------------------- | -------- |
| 0001 | [Container orchestration with Dokploy](0001-container-orchestration-with-dokploy.md) | Proposed |
| 0002 | [Reverse proxy routing with Traefik](0002-reverse-proxy-routing-with-traefik.md)     | Proposed |
| 0003 | [Institutional network egress restrictions](0003-institutional-network-egress-restrictions.md) | Proposed |
| 0004 | [Public exposure via Cloudflare Worker](0004-public-exposure-via-cloudflare-worker.md) | Proposed |
