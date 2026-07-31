# ADR 0001: Phase 1 runtime and security decisions

- **Status:** Accepted for the first vertical slice
- **Date:** 2026-07-31

## Context

The approved documentation left authentication provider, row-level security, temporal input details, and package layout open. The first slice needs a runnable local workflow without implying production readiness or adding an external provider.

## Decisions

1. Use a pnpm workspace with the Next.js application in `apps/web` and framework-independent domain, authorization, integration, and database modules in `packages/`.
2. Use a signed, HTTP-only, same-site development session cookie over seeded synthetic users. It is not password authentication and must be replaced through a production identity ADR before deployment.
3. Resolve organization membership from the authenticated user and route slug on the server. Browser-submitted organization identifiers are never accepted as authority.
4. Use coarse seeded membership roles (`OPERATOR`, `APPROVER`, `VIEWER`) and atomic policy permissions. `APPROVER` may approve intake revisions; operators cannot.
5. Enforce tenant ownership through non-null organization IDs, composite foreign keys, scoped queries, and negative integration tests. PostgreSQL RLS remains deferred until a safe request/connection-pooling context is designed and tested.
6. Store pickup/delivery as calendar dates and appointment values as UTC instants. The initial UI labels browser local values but normalizes them to UTC; facility IANA time-zone selection is a known limitation.
7. Treat approval as the explicit approval request and decision in one command because this slice has a single human approver interaction. The exact immutable revision is bound and load creation occurs in the same serializable transaction.
8. Use a deterministic, labeled-text mock extractor behind an interface. Its limited patterns demonstrate provenance and validation boundaries; it is not natural-language understanding.

## Consequences

The slice is useful locally and exercises authorization, tenancy, validation, revisioning, approval, idempotency, load creation, and audit boundaries. It is not production deployable until a secure identity provider, facility time zones, operational database roles/backups, and deployment controls are selected.
