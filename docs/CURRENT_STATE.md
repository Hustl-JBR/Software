# Current state

Last verified: 2026-08-01. Branch: `codex/create-initial-documentation-and-project-plan`.

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

## Tests

Unit tests cover domain validation, extraction, demo intake/idempotency, operations-data consistency, navigation state, privacy helpers, and carrier-compliance boundaries. The demo Playwright suite covers every sidebar route, direct loading, active state, browser history, controlled not-found handling, contact masking/reveal/call logging, shared tracking attention, carrier blocking, and console cleanliness. CI also defines formatting, lint, Prisma generation/deployment, type checking, unit/integration tests, build, and Playwright. Last verification: formatting, lint, type checking, 22 unit tests, 12 demo browser tests, demo production build, and a clean in-app browser walkthrough passed.

Exact next recommended task: deploy the implemented persistent slice to the isolated Railway staging project and complete the PostgreSQL, authentication, persistence, isolation, restart, and log verification gates.

## Persistent staging implementation

The branch now contains a deployable minimal staging slice: Better Auth email/password authentication with database sessions and disabled public sign-up; active/deactivated users; multiple membership roles; guarded synthetic account provisioning; tenant-scoped PostgreSQL records for customer calls, quotes/approval/acceptance, manual carrier qualification and selection, driver assignment, appointment confirmation, load ownership/next action, tracking updates, communications, tasks, and audit events; `/api/health`; and a persistent staging workspace at `/org/atlas-staging/staging`.

Consequential quote approval, acceptance, load approval, and carrier selection use idempotency records. Quote approval enforces creator/approver separation. Unconfirmed authority/insurance or synthetic cargo coverage below $100,000 blocks carrier selection. No check is represented as official verification.

Local verification on Node 24: formatting, ESLint, strict TypeScript, 22 unit tests, 12 demo Playwright tests, and a demo production build pass. PostgreSQL migration/integration tests and persistent authenticated Playwright tests await the private Railway staging database and deployment. Demo mode remains browser-only and PostgreSQL-free.
