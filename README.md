# Project Atlas

Project Atlas is a human-controlled operating platform for domestic full-truckload (FTL) dry-van freight. The first release is an internal tool for a small founding team—not an autonomous broker, carrier-booking agent, payment system, or claims handler.

## Product principles

- Humans own consequential decisions; Atlas prepares, validates, recommends, and records.
- Tenant boundaries, least privilege, explicit approvals, idempotency, and immutable audit evidence are foundational.
- AI suggestions are untrusted structured input until deterministic validation and human approval.
- Monetary values are integer cents with an explicit ISO 4217 currency.
- External systems sit behind adapters and remain mocked until official documentation, contracts, and credentials exist.

## Documentation map

| Document                                             | Purpose                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Product requirements](docs/product-requirements.md) | Scope, workflows, personas, requirements, assumptions, and open questions          |
| [Architecture](docs/architecture.md)                 | System boundaries, proposed repository, runtime design, and cross-cutting controls |
| [Data model](docs/data-model.md)                     | Entities, relationships, invariants, tenancy, and retention                        |
| [Load state machine](docs/load-state-machine.md)     | Load lifecycle, guards, milestones, and exceptions                                 |
| [Security model](docs/security-model.md)             | Authentication, RBAC, authorization, and threat controls                           |
| [AI safety](docs/ai-safety.md)                       | Structured AI workflows, validation, approvals, and evaluation                     |
| [Integrations](docs/integrations.md)                 | Adapter contracts and mock-first policy                                            |
| [Testing strategy](docs/testing-strategy.md)         | Test pyramid, security tests, fixtures, and release gates                          |
| [Development roadmap](docs/development-roadmap.md)   | Phases and a small, testable Phase 1 backlog                                       |

## Recommended first vertical slice

Build **authenticated shipment intake through human-reviewed load creation**: a user enters a structured request or plain-English message; Atlas (initially a deterministic mock extractor) produces schema-versioned candidate fields and explicit issues; a permitted reviewer corrects and approves them; the backend transaction creates a draft load and immutable audit entries using an idempotency key. This exercises tenancy, RBAC, validation, AI boundaries, approval, persistence, and testing without sending messages, quoting, booking, tracking, invoicing, or paying anyone.

## Implemented vertical slice

Atlas now includes a minimal internal application for the first controlled workflow:

1. Sign in with one of the synthetic development identities.
2. Open an organization-scoped dashboard and submit plain-English and/or structured shipment facts.
3. Run deterministic mock extraction and display missing, invalid, conflicting, and uncertain information.
4. Save human corrections as new immutable revisions.
5. Approve an exact valid revision as an authorized approver.
6. Atomically create one `DRAFT` load, pickup and delivery stops, initial status history, approval evidence, idempotency result, and audit events.
7. Review the created load and correlated audit timeline.

No real AI, messaging, tracking, mapping, carrier, quote, invoice, document, or payment integration is included.

## Local setup

Prerequisites are Node.js 22+, pnpm 10+, and PostgreSQL 16+.

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000` and use a seeded synthetic identity:

- `approver@atlas.local` — create, correct, approve, and view for Atlas North.
- `operator@atlas.local` — create and correct, but cannot approve.
- `viewer@atlas.local` — read-only.
- `south@atlas.local` — approver in a separate organization for isolation checks.

This passwordless selector is explicitly a **development authentication seam**, not production authentication. It sets a signed, HTTP-only, same-site session cookie. Select and integrate a production identity provider before deployment.

## Commands

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm dev`              | Run the Next.js development server                          |
| `pnpm build`            | Create a production build                                   |
| `pnpm lint`             | Run Next.js ESLint rules                                    |
| `pnpm typecheck`        | Run strict TypeScript checking                              |
| `pnpm test`             | Run unit and PostgreSQL integration tests                   |
| `pnpm test:unit`        | Run deterministic domain/adapter tests                      |
| `pnpm test:integration` | Run real-PostgreSQL command tests (requires `DATABASE_URL`) |
| `pnpm format:check`     | Check formatting                                            |
| `pnpm db:migrate`       | Create/apply a development migration                        |
| `pnpm db:deploy`        | Apply checked-in migrations                                 |
| `pnpm db:seed`          | Seed two organizations and synthetic users                  |

The integration suite intentionally skips when `DATABASE_URL` is absent; it must run against PostgreSQL before merge or deployment.
