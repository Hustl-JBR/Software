# Testing strategy

## Goals

Tests should prove domain correctness, tenant isolation, authorization, human-control boundaries, retry safety, audit completeness, and recoverable failure—not merely UI rendering.

## Test layers

- **Static checks:** formatting, lint, strict TypeScript, dependency/secret scanning, migration linting.
- **Unit:** money/margin functions, pricing rule evaluation, permissions, approval hashes, Zod schemas, state transitions, issue detection, redaction, and adapter error mapping.
- **Integration (real PostgreSQL):** repositories, constraints, transactions, migrations, RLS if enabled, idempotency races, optimistic concurrency, audit/outbox atomicity, and job retries.
- **Contract:** every adapter against a shared suite using deterministic fakes; later verify official sandbox/provider behavior without asserting undocumented details.
- **End-to-end:** a few high-value browser flows: login/tenant switch, intake review/approval, quote approval/send boundary, booking approval boundary, document quarantine/review, and finance approval boundaries as introduced.
- **Security:** cross-tenant matrix, IDOR, role escalation, CSRF/session, upload abuse, signed URL expiry, export authorization, log redaction, prompt injection, and requester/self-approval restrictions.
- **AI evaluation:** offline golden datasets and adversarial cases; no live nondeterministic model call in required CI.

## Test data and environments

Factories create at least two organizations with similar identifiers to reveal missing scopes. Use synthetic people, addresses, messages, rates, documents, and credentials only. Freeze clock/random IDs where useful. Each integration test runs in an isolated transaction/schema/database and can run in parallel. Deterministic mock adapters support success, timeout, duplicate, out-of-order, rejection, and unknown-outcome scenarios.

## Critical invariants to test

1. Every tenant-owned read/write/link/export denies a user from another organization.
2. Permission and state checks occur on the server; stale UI cannot bypass them.
3. Repeating a consequential command with the same key returns the same result; a different payload is rejected.
4. Domain mutation, audit event, and outbox row are atomic.
5. Approval binds an exact revision; requester cannot self-approve where prohibited; edits invalidate approval.
6. Invalid AI output never mutates authoritative fields; missing/conflicting values remain visible.
7. Money calculations use cents with explicit rounding, currency, negative/zero edge cases, and overflow bounds.
8. State transitions reject illegal, concurrent, duplicate, and out-of-order commands.
9. Quarantined/unscanned documents cannot be downloaded or extracted.
10. At-least-once jobs/webhooks do not create duplicate sends, events, invoices, bookings, or payments.

## CI and release gates

Pull requests run format/lint/type/unit checks and integration tests with PostgreSQL; affected E2E and schema migration tests run before merge. Main/staging runs the full E2E, security matrix, migration up/down or forward-recovery rehearsal, adapter contracts, and AI regression suite. Production promotion requires review, backup/restore confidence, migration plan, observability, rollback/feature flag, and no unresolved critical vulnerability.

Avoid brittle snapshots of whole pages or model prose. Prefer behavior and invariant assertions. Flaky tests are quarantined only with an owner and deadline; security/tenant tests are never optional.
