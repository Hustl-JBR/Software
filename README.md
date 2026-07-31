# Project Atlas

Project Atlas is a human-controlled operating platform for domestic full-truckload (FTL) dry-van freight. The first release is an internal tool for a small founding team—not an autonomous broker, carrier-booking agent, payment system, or claims handler.

## Product principles

- Humans own consequential decisions; Atlas prepares, validates, recommends, and records.
- Tenant boundaries, least privilege, explicit approvals, idempotency, and immutable audit evidence are foundational.
- AI suggestions are untrusted structured input until deterministic validation and human approval.
- Monetary values are integer cents with an explicit ISO 4217 currency.
- External systems sit behind adapters and remain mocked until official documentation, contracts, and credentials exist.

## Documentation map

| Document | Purpose |
| --- | --- |
| [Product requirements](docs/product-requirements.md) | Scope, workflows, personas, requirements, assumptions, and open questions |
| [Architecture](docs/architecture.md) | System boundaries, proposed repository, runtime design, and cross-cutting controls |
| [Data model](docs/data-model.md) | Entities, relationships, invariants, tenancy, and retention |
| [Load state machine](docs/load-state-machine.md) | Load lifecycle, guards, milestones, and exceptions |
| [Security model](docs/security-model.md) | Authentication, RBAC, authorization, and threat controls |
| [AI safety](docs/ai-safety.md) | Structured AI workflows, validation, approvals, and evaluation |
| [Integrations](docs/integrations.md) | Adapter contracts and mock-first policy |
| [Testing strategy](docs/testing-strategy.md) | Test pyramid, security tests, fixtures, and release gates |
| [Development roadmap](docs/development-roadmap.md) | Phases and a small, testable Phase 1 backlog |

## Recommended first vertical slice

Build **authenticated shipment intake through human-reviewed load creation**: a user enters a structured request or plain-English message; Atlas (initially a deterministic mock extractor) produces schema-versioned candidate fields and explicit issues; a permitted reviewer corrects and approves them; the backend transaction creates a draft load and immutable audit entries using an idempotency key. This exercises tenancy, RBAC, validation, AI boundaries, approval, persistence, and testing without sending messages, quoting, booking, tracking, invoicing, or paying anyone.

## Current repository status

This foundation is documentation only. No application, dependency, database migration, external integration, or deployable infrastructure has been created.
