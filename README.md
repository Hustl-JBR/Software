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

## Required software

- Git.
- Node.js **22 LTS** (the repository declares `22.x`).
- Corepack, included with the official Node.js distribution.
- Docker Desktop with Docker Compose **or** a native PostgreSQL 16 installation.

The repository pins pnpm 10.28.1 through `packageManager`. Do not install a different global package manager.

## Cross-platform local setup

Run these commands from the repository root in Bash, zsh, or PowerShell. Docker Compose runs PostgreSQL only; the application continues to run directly on the host.

```bash
corepack enable
corepack prepare pnpm@10.28.1 --activate
docker compose up -d postgres
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

If using native PostgreSQL instead, create `atlas` and `atlas_test` databases owned by a local `atlas` user, then update `DATABASE_URL` in `.env`. Never reuse a production database.

The seed command refuses to run unless `SEED_DEVELOPMENT_DATA=true`. The example environment enables it only for the disposable local workflow; remove it from any shared or production configuration.

Open `http://localhost:3000` after the development server reports that it is ready.

### Browser-only demo mode

Demo mode skips authentication and PostgreSQL while preserving the real backend path for later verification. It stores synthetic shipment requests, revisions, loads, stops, and audit events only in the running Next.js process. All demo data is discarded when the server restarts.

PowerShell:

```powershell
$env:ATLAS_DEMO_MODE="true"
pnpm dev
```

Bash or zsh:

```bash
ATLAS_DEMO_MODE=true pnpm dev
```

Open `http://localhost:3000`. Atlas redirects directly to the synthetic Atlas North dashboard and labels every screen `DEMO MODE`. Unset the variable to restore the normal authentication and PostgreSQL behavior.

### Windows PowerShell

Install Git, Node.js 22 LTS, and Docker Desktop first. Ensure Docker Desktop is running and configured for Linux containers. Then open PowerShell in the repository root:

```powershell
corepack enable
corepack prepare pnpm@10.28.1 --activate
docker compose up -d postgres
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

If PowerShell reports that Corepack cannot modify the Node.js installation, reopen PowerShell as Administrator for `corepack enable`, close it, and run the remaining commands in a normal non-administrator terminal.

To stop PostgreSQL without deleting local data:

```powershell
docker compose stop postgres
```

To permanently remove the local Atlas databases and start clean, run `docker compose down -v`. This is destructive and must never be used against shared or production data.

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
| `pnpm test:e2e`         | Run the single Playwright browser workflow test             |
| `pnpm format:check`     | Check formatting                                            |
| `pnpm db:migrate`       | Create/apply a development migration                        |
| `pnpm db:deploy`        | Apply checked-in migrations                                 |
| `pnpm db:seed`          | Seed two organizations and synthetic users                  |

The integration suite intentionally skips when `DATABASE_URL` is absent; it must run against PostgreSQL before merge or deployment. For the Compose test database, temporarily set `DATABASE_URL` to `postgresql://atlas:atlas@localhost:5432/atlas_test?schema=public`, deploy migrations, and run the integration suite:

```bash
DATABASE_URL="postgresql://atlas:atlas@localhost:5432/atlas_test?schema=public" pnpm db:deploy
DATABASE_URL="postgresql://atlas:atlas@localhost:5432/atlas_test?schema=public" pnpm test:integration
```

PowerShell equivalent:

```powershell
$env:DATABASE_URL="postgresql://atlas:atlas@localhost:5432/atlas_test?schema=public"
pnpm db:deploy
pnpm test:integration
Remove-Item Env:DATABASE_URL
```

Run the complete local verification sequence before opening a pull request:

```bash
pnpm format:check
pnpm lint
pnpm db:generate
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The E2E test expects the development seed identities in an isolated database and must not target a shared environment.
