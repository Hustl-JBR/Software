# Current state

Last verified locally: 2026-08-02. Recovery branch: `codex/integrate-claude-review`, based on verified commit `e353adf`.

Claude's reported branch, six commits, Git bundle, and patch were not present locally, in uploaded attachments, or on the fetched GitHub remote. The current recovery is therefore a clean-room recreation of the behaviors described in the owner-approved handoff, not an exact import.

## Current recovery milestone

- `/operations` is the normal authenticated employee workspace; the old organization staging route redirects there.
- `/internal/staging-tools` preserves synthetic command controls, is absent from employee navigation, and requires the full staging administrator capability bundle.
- Load actions live in Overview, Pricing, Sourcing, Carrier, Stops, Tracking, Communications, and Tasks on the load record. Timeline uses employee language; Audit retains technical identifiers.
- Explicit role rows are authoritative and role changes synchronize the compatibility column. A regression test proves demotion from APPROVER to VIEWER revokes quote approval.
- Staging review no longer invents confidence, mileage/transit, capacity, or missing equipment. Demo-only concepts remain labeled synthetic.
- Malformed UUIDs return the controlled unavailable screen, and database errors are mapped to safe operator codes before redirects.
- USD is entered/displayed as dollars and stored as integer cents through shared parsing/formatting.
- The equipment catalog includes dry van, reefer, flatbed, step deck, conestoga, lowboy, RGN, power only, box truck, sprinter, hotshot, tanker, plus optional detail.
- DRAFT loads reject physical tracking milestones. A forward migration safely reclassifies contradictory synthetic tracking rows as manual check calls.
- All non-date Prisma `DateTime` fields explicitly declare `@db.Timestamptz(6)`; the original SQL already created those columns as `TIMESTAMPTZ`, so the new migrations contain no timestamp conversion.

Verified recovery results: formatting, ESLint, strict TypeScript, Prisma generation, and production build pass; 46 unit tests pass; 12 demo Playwright tests pass; and the in-app browser has a clean console/no horizontal overflow at 1920, 1440, 1280, 1024, 768, and 390 px. Railway deployment `0917b316-2370-4fa6-a57d-57d624ead488` applied both migrations and passed 29 PostgreSQL integration tests, guarded seed, two Better Auth sign-ins, shared-tenant/cross-tenant checks, and persistence confirmation. Health reports `status: ok`, `mode: staging`, and `database: reachable`. The three implementation commits are pushed and draft PR [#2](https://github.com/Hustl-JBR/Software/pull/2) is open.

Published approved demo baseline: commit `9a178c7`, remote branch `origin/codex/create-initial-documentation-and-project-plan`, draft pull request [#1](https://github.com/Hustl-JBR/Software/pull/1). The four approved demo commits were published without rewriting history on 2026-07-31.

Important commits: `7402aaf` establishes the approved demo foundation; `8057364` adds connected demo load operations; `66952d3` connects the demo operations workspaces and safety boundaries; the current documentation/test commit records the verified handoff; `c7f57aa` hardens vertical-slice verification; `fd60f6f` implements reviewed shipment intake.

## What works

Demo mode supports sign-in bypass, intake, deterministic extraction, correction, exact-revision approval, draft-load creation, a 12-load workspace, attention queue, synthetic tracking and ETA simulation, delay propagation, exceptions, unsent communication drafts, stops, documents, financials, pricing, carrier sourcing, global tracking, Network, Analytics, Documents, Settings, carrier profiles, and masked load contacts. Sensitive contact reveals create demo audit events, logged calls appear in communications, interrupted tracking creates shared command-center attention, and carrier selection is blocked for unresolved insurance or insufficient cargo coverage.

The real backend still contains Prisma/PostgreSQL shipment intake, tenant authorization, idempotent approval, immutable revisions, audit events, migrations, seed data, and integration tests. Demo work does not replace those paths.

Permanent freight-domain boundary: Atlas sources, reviews, negotiates with, and selects a motor carrier or owner-operator business. Only after carrier selection does that carrier assign a driver and provide dispatcher, tractor, trailer, and tracking details. Carrier selection and driver assignment remain separate even when the driver is also the owner-operator. Atlas is not a driver-recruiting marketplace.

## Demo-only and limitations

All operations, tracking, contacts, compliance, market, carrier, financial, and analytics values are synthetic. Browser-session state is stored locally and resets when the session is cleared. No FMCSA, GPS, map, load-board, email, SMS, accounting, payment, or AI provider is connected. The real PostgreSQL integration suite remains unverified on this Windows environment because no PostgreSQL service was started during the design phases.

## Launch

```powershell
$env:ATLAS_DEMO_MODE="true"
corepack pnpm dev
```

## Routes

- `/operations` normal authenticated employee workspace (demo redirects to demo loads)
- `/org/atlas-north` command center
- `/org/atlas-north/loads` loads workspace
- `/org/atlas-north/loads/[id]` load operations
- `/org/atlas-north/tracking` global tracking
- `/org/atlas-north/network` carrier/driver/customer/facility/lane network
- `/org/atlas-north/network/carriers/[carrier]` carrier profile
- `/org/atlas-north/documents` document control
- `/org/atlas-north/analytics` management analytics
- `/org/atlas-north/settings` demo policies
- `/org/atlas-north/requests/new` intake
- `/org/atlas-north/requests/[id]` review and approval
- `/internal/staging-tools` hidden staging administrator test console

## Tests

Unit tests cover domain validation, extraction, demo intake/idempotency, operations-data consistency, navigation state, privacy helpers, and carrier-compliance boundaries. The demo Playwright suite covers every sidebar route, direct loading, active state, browser history, controlled not-found handling, contact masking/reveal/call logging, shared tracking attention, carrier blocking, and console cleanliness. CI also defines formatting, lint, Prisma generation/deployment, type checking, unit/integration tests, build, and Playwright. Last verification: formatting, lint, type checking, 22 unit tests, 12 demo browser tests, demo production build, and a clean in-app browser walkthrough passed.

Exact next recommended implementation phase after this recovery: a reviewed employee invitation/provisioning flow with secure credential enrollment. Backup/restore readiness remains a release prerequisite, not a reason to broaden this implementation phase.

## Persistent staging implementation

The branch now contains a deployable minimal staging slice: Better Auth email/password authentication with database sessions and disabled public sign-up; active/deactivated users; multiple membership roles; guarded synthetic account provisioning; tenant-scoped PostgreSQL records for customer calls, quotes/approval/acceptance, manual carrier qualification and selection, driver assignment, appointment confirmation, load ownership/next action, tracking updates, communications, tasks, and audit events; `/api/health`; and a persistent staging workspace at `/org/atlas-staging/staging`.

Consequential quote approval, acceptance, load approval, and carrier selection use idempotency records. Quote approval enforces creator/approver separation. Unconfirmed authority/insurance or synthetic cargo coverage below $100,000 blocks carrier selection. No check is represented as official verification.

Local verification on Node 24: formatting, ESLint, strict TypeScript, 22 unit tests, 12 demo Playwright tests (the persistent test is correctly skipped in demo mode), and a demo production build pass. Railway pre-deploy verification applies both migrations, runs 25 PostgreSQL integration tests, seeds four synthetic employees, signs in as Alex and Blair, verifies shared organization data and cross-organization denial, and confirms a persistent synthetic shipment after redeployment. Demo mode remains browser-only and PostgreSQL-free.

Railway's initial security gate rejected the inherited `next@15.4.5` before build execution because of published critical advisories. The branch now pins the patched `next@15.4.10` maintenance release required by Railway.

## Deployed staging

- Railway project: `Project Atlas` (`8c53093a-edf1-44bf-ad2d-36c81f177252`)
- Environment: only `staging` (`909ec8d9-b384-4073-9784-00398f4dca5b`)
- Web: `divine-purpose`, deployed from this branch at `https://divine-purpose-staging.up.railway.app`
- Database: `Postgres`, persistent volume and private endpoint only; no public domain or TCP proxy
- Health: `GET /api/health` returned `status: ok` and `database: reachable`
- Synthetic users: `alex.sales@atlas-staging.invalid`, `blair.approver@atlas-staging.invalid`, `casey.operations@atlas-staging.invalid`, and `devon.admin@atlas-staging.invalid`
- Data boundary: synthetic staging data only; no production resources or third-party freight services
