# Project Atlas contributor instructions

## Required handoff reading

Before changing code, every coding agent must read `docs/CURRENT_STATE.md`, `docs/PRODUCT_VISION.md`, `docs/DEMO_ARCHITECTURE.md`, `docs/IMPLEMENTATION_HISTORY.md`, `docs/DECISIONS.md`, `docs/NEXT_STEPS.md`, `docs/KNOWN_ISSUES.md`, and `docs/DOMAIN_GLOSSARY.md`. Update `CURRENT_STATE.md` and `IMPLEMENTATION_HISTORY.md` after every meaningful change. Conversation history is not an authoritative project record.

These instructions apply to the entire repository.

## Product boundaries

- Treat Atlas as a new, independent codebase. Do not copy from or depend on unrelated projects.
- Optimize first for domestic United States FTL dry-van operations and human-reviewed decisions.
- Do not implement autonomous quoting, carrier selection/booking, rate confirmations, accessorial approval, invoicing, payments, claims resolution, or compliance overrides.
- Do not claim behavior for an external freight service without official documentation. Use typed adapter interfaces and deterministic mocks.

## Engineering rules

- Use strict TypeScript, Zod at trust boundaries, PostgreSQL, and Prisma unless an approved architecture decision record says otherwise.
- Store money as integer cents plus currency; never use floating-point arithmetic for money.
- Scope every tenant-owned query and mutation by `organizationId`; deny by default.
- Authorize server-side. UI visibility is not an authorization control.
- Require idempotency keys for consequential commands and record major actions in an append-only audit log.
- Treat model output as untrusted. Parse against versioned schemas, run deterministic domain validation, and require the documented approvals.
- Never put secrets, credentials, production customer data, or real freight documents in the repository or test fixtures.
- Prefer small modules and tests over premature packages or distributed services. Do not add a dependency when platform functionality is adequate.

## Change workflow

1. Read the relevant documents in `docs/` and update them when behavior or boundaries change.
2. Add or update unit/integration tests for every behavior change, including authorization and tenant-isolation cases.
3. Use migrations for schema changes; never edit production data manually.
4. Run formatting, linting, type checking, unit tests, integration tests, and affected end-to-end tests before merging.
5. Capture material architecture decisions as an ADR under `docs/adr/` when that directory is introduced.

## Definition of done

A change is not done until inputs are validated, authorization and tenant scope are enforced, important commands are idempotent, major actions are audited, failure modes are tested, and documentation is consistent.
