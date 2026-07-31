# Development roadmap

## Delivery principles

Deliver thin, demonstrable vertical slices; keep a modular monolith; introduce infrastructure only when exercised; hide incomplete capabilities behind flags; and do not weaken approval, tenant, audit, or idempotency controls for speed.

## Phases

### Phase 0 — decisions and operating policy

Resolve legal operating role, user/approver matrix, quote/acceptance evidence, carrier qualification policy, money/margin definitions, document retention, data/AI policy, and initial hosting/auth/storage choices. Create ADRs and a threat model.

### Phase 1 — secure reviewed intake to draft load

Establish the application skeleton, identity/organization boundary, scoped persistence, audit/idempotency primitives, customer/facility records, shipment intake, deterministic mock structured extraction, issue resolution, human approval, and draft load/stops. No messages or external services.

### Phase 2 — human-controlled quote workflow

Add manual market inputs, versioned rule sets, deterministic cents/margin calculation, quote revisions, risk flags, approval, customer acceptance evidence, and communication drafts. Sending remains mocked/manual until an adapter is approved.

### Phase 3 — carrier capacity and dispatch

Add carrier profiles, manually evidenced compliance checks, offers, human selection/approval, bookings, rate-confirmation revisions, and dispatch controls. No autonomous booking or compliance override.

### Phase 4 — execution visibility

Add stop milestones, manual tracking events, delay rules, exception ownership/escalation, communication drafts, and a mocked tracking adapter. Validate multi-stop behavior.

### Phase 5 — documents and reconciliation

Add private uploads, scan/quarantine workflow, BOL/POD/invoice/receipt classification/extraction candidates, human review, approved charge matching, discrepancies, and retention policy implementation.

### Phase 6 — finance preparation

Add customer invoice and carrier bill revisions, approval thresholds, exports/mocks, settlement status, and reconciliation. Payment execution remains out of scope until a separate security/legal project approves it.

### Phase 7 — controlled integrations and optimization

Select providers from official documentation, complete contract/security reviews, certify adapters, expand evaluations/observability, and automate low-risk preparation. Any reduction of human gates requires explicit risk review, evidence, policy, and rollout controls.

## Phase 1 backlog: small, testable steps

Each step ends with documentation and automated tests appropriate to its layer.

1. **Record decisions:** create ADR template; decide runtime/package manager/Node version, auth approach, hosting assumptions, identifiers, time/money conventions. _Test:_ documentation link/check.
2. **Scaffold workspace:** minimal Next.js strict-TypeScript app and only required tooling; add format/lint/type/test CI. _Test:_ clean checkout passes all checks and renders a health page.
3. **Add local PostgreSQL:** reproducible development/test configuration and migration commands; no shared secrets. _Test:_ migration applies to empty database and application health verifies connectivity.
4. **Model tenancy:** Organization, User, Membership, Role/Permission (or approved simplified seed roles). _Test:_ constraints and two-tenant fixtures.
5. **Implement authentication seam:** secure chosen provider/session wrapper and dev/test fake. _Test:_ unauthenticated denial, inactive membership denial, session revocation.
6. **Implement policy API:** typed actions, deny-by-default checks, server helpers. _Test:_ table-driven role/action and cross-tenant matrix.
7. **Create scoped repositories:** require organization context and compound tenant relationships. _Test:_ cross-tenant reads/writes/links all fail.
8. **Add audit ledger:** append-only event writer, correlation IDs, redaction rules, database privileges. _Test:_ mutation and audit are atomic; application cannot update/delete evidence.
9. **Add idempotent command runner:** request hashing, conflict behavior, in-progress recovery, transaction integration. _Test:_ sequential/concurrent duplicate and changed-payload cases.
10. **Add customer/facility/contact minimum:** only fields required for intake and stop snapshots. _Test:_ CRUD permissions, validation, tenant isolation, and audit.
11. **Define intake contracts:** versioned Zod schemas for source, candidate fields, issues, units, local dates/time zones, and approval. _Test:_ valid, missing, conflicting, boundary, and malicious payload fixtures.
12. **Persist intake safely:** intake/extraction/issue records separated from authoritative load data; protect raw content. _Test:_ invalid candidates cannot become load fields.
13. **Build deterministic extractor fake:** fixture/rule-based structured output with configurable ambiguity/failure; define provider interface only. _Test:_ stable success, missing/conflict, malformed, timeout, and prompt-injection-like inputs.
14. **Build minimal intake UI/API:** structured and plain-text entry, review screen with source/candidate/issues, corrections, accessible error summary. _Test:_ component/API tests and one E2E submission/review path.
15. **Implement intake approval:** bind approval to immutable extraction/correction revision; require reviewer permission and separation policy. _Test:_ stale/edit/self/duplicate/cross-tenant approval rejection.
16. **Implement draft load creation:** idempotent command creates load plus ordered stop snapshots from an approved complete intake, audit, and outbox record. _Test:_ transaction rollback, required fields, stop order, cents/time invariants, concurrent retry.
17. **Add minimal load view:** show facts, provenance, `DRAFT` status, status/audit history; no quote/booking buttons. _Test:_ tenant/role visibility and E2E approval-to-draft flow.
18. **Add operational safeguards:** structured redacted logs, metrics for failures/approval backlog, error handling, backup/restore rehearsal, threat-model review. _Test:_ sensitive fixture absent from logs and recovery runbook exercised.
19. **Phase gate:** demo with synthetic loads; review accessibility, security matrix, AI evaluation baseline, audit completeness, and open business decisions. Do not start quote sending until approval policy is signed off.

## Smallest useful vertical slice

Steps 1–17 produce the recommended slice: **shipment request -> structured candidate plus explicit issues -> human correction/approval -> idempotent draft load with stops and audit history**. It gives operators useful data capture and validates the riskiest foundations without any real AI/vendor dependency or external side effect.

## Dependencies and exit criteria

Phase 1 production use requires an approved legal/data policy, chosen secure authentication and private storage approach (even if documents are deferred), tenant/security test suite, backup/restore procedure, incident contacts, synthetic pilot completion, and explicit acceptance of remaining limitations. Quote, carrier, invoice, and payment capabilities are not implied by Phase 1 completion.
