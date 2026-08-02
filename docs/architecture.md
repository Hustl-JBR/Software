# Architecture plan

## Proposed repository structure

```text
/
├── AGENTS.md
├── README.md
├── apps/
│   ├── web/                 # Next.js UI, route handlers, server actions
│   └── worker/              # Background job entry point (when needed)
├── packages/
│   ├── db/                  # Prisma schema, migrations, tenant-aware repositories
│   ├── domain/              # Framework-free entities, policies, state machines
│   ├── contracts/           # Zod command/event/adapter schemas
│   ├── auth/                # Session, membership, authorization helpers
│   ├── ai/                  # Prompts, structured schemas, evaluators, provider adapter
│   ├── integrations/        # Interfaces plus deterministic mocks
│   ├── jobs/                # Job definitions, idempotent handlers, outbox dispatcher
│   ├── observability/       # Logging, metrics, tracing, redaction
│   └── test-support/        # Factories and tenant-isolation helpers
├── tests/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── adr/                 # Material architecture decisions
│   └── ...
├── prisma/ or packages/db/prisma/
├── package.json
├── pnpm-workspace.yaml
└── tooling configuration
```

Create directories only when the corresponding code exists. Start as a modular monolith; workspace packages are boundaries, not separately deployed services.

## System context

- **Browser:** internal responsive UI with no direct database, object-store, AI, or vendor access.
- **Next.js application:** authentication, command/query endpoints, server-rendered UI, schema validation, authorization, orchestration, and audit creation.
- **PostgreSQL:** authoritative transactional data, approvals, idempotency, outbox, and audit ledger.
- **Private object storage:** original documents and derived artifacts; PostgreSQL stores metadata and integrity hashes.
- **Worker:** asynchronous scan/extraction, notifications, and projections using a durable queue or PostgreSQL-backed job mechanism selected by ADR.
- **AI provider:** invoked only server-side through an adapter for narrow structured tasks.
- **External freight/business systems:** adapter interfaces and mocks only until explicitly approved.

## Layering and command flow

1. A transport layer authenticates the user and validates a versioned Zod request.
2. An application command loads organization membership and asks a domain policy for authorization.
3. Domain logic validates invariants and returns intended state changes/events; it has no framework/provider imports.
4. A tenant-aware repository executes a database transaction containing the mutation, audit entry, idempotency result, and outbox event.
5. Post-commit side effects run from the durable outbox. Retries use stable operation keys.
6. Read models always include organization scope and return least-privilege views.

AI output enters at step 1 as untrusted candidate input; it never bypasses steps 2–4.

## Key architectural choices

- **Modular monolith first:** simpler transactions, deployment, debugging, and access control; extract services only with measured need.
- **Server-side authorization:** centralized policy functions take actor, organization, resource, action, and context.
- **PostgreSQL transactions:** Prisma for ordinary access; reviewed SQL may be used for constraints/locking unsupported by Prisma.
- **Defense-in-depth tenancy:** mandatory `organizationId`, compound keys/indexes, scoped repositories, negative tests, and preferably PostgreSQL row-level security after connection/pooling semantics are proven.
- **Outbox over inline effects:** network operations never decide transaction success. An outbox row is committed with domain changes and delivered at least once.
- **Immutable evidence:** append-only audit records; corrections are new events. Restrict update/delete at application and database privilege layers.
- **Version everything material:** AI schemas/prompts, pricing rules, policies, quote revisions, document extractions, and communication drafts.

## Domain modules

Identity, organizations, CRM, carrier/compliance, intake, loads/stops, pricing/quotes, capacity/booking, tracking/exceptions, communications, documents, approvals, receivables, payables, payments (recording only initially), AI governance, and audit. Modules communicate through typed application APIs/events rather than reaching into each other's tables casually.

## Consistency and concurrency

- Use UUID/ULID-style opaque IDs and human-readable numbers unique within an organization.
- Commands carry `Idempotency-Key`; persist organization, actor, command type, request hash, status, and serialized result under a unique constraint.
- Reject reuse with a different request hash. Concurrent transitions use a version column/optimistic concurrency or row lock.
- Store timestamps as UTC; appointment windows include the facility time zone and original local representation.
- Store money as signed 64-bit cents, currency, and semantic type. Compute gross profit as customer charge total minus carrier cost total; margin basis points must define the zero/negative-revenue rule.

## Deployment and operations

Use separate development/staging/production accounts, managed PostgreSQL, private object storage, centralized secret management, least-privilege workload identities, encrypted backups, migration gates, and infrastructure as code when deployment begins. Logs are structured and redact message/document bodies, credentials, tokens, and unnecessary PII. Correlation IDs connect request, command, job, AI run, approval, and audit entries.

Monitor request errors/latency, job age/retries/dead letters, state-transition failures, approval backlog, AI parse/validation failures, document scan state, outbox lag, and authorization denials. Alert without leaking customer data.

## Architecture decisions still required

Record ADRs before choosing authentication vendor/library, queue technology, object-storage provider, AI model/provider configuration, hosting, observability stack, RLS approach, and email/SMS/accounting/compliance vendors.
