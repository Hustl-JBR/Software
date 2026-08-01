# Current state

Last verified: 2026-07-31. Branch: `codex/create-initial-documentation-and-project-plan`.

Important commits: `7402aaf` establishes the approved demo foundation; `8057364` adds connected demo load operations; `66952d3` connects the demo operations workspaces and safety boundaries; the current documentation/test commit records the verified handoff; `c7f57aa` hardens vertical-slice verification; `fd60f6f` implements reviewed shipment intake.

## What works

Demo mode supports sign-in bypass, intake, deterministic extraction, correction, exact-revision approval, draft-load creation, a 12-load workspace, attention queue, synthetic tracking and ETA simulation, delay propagation, exceptions, unsent communication drafts, stops, documents, financials, pricing, carrier sourcing, global tracking, Network, Analytics, Documents, Settings, carrier profiles, and masked load contacts. Sensitive contact reveals create demo audit events, logged calls appear in communications, interrupted tracking creates shared command-center attention, and carrier selection is blocked for unresolved insurance or insufficient cargo coverage.

The real backend still contains Prisma/PostgreSQL shipment intake, tenant authorization, idempotent approval, immutable revisions, audit events, migrations, seed data, and integration tests. Demo work does not replace those paths.

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

Exact next recommended task: extend the typed browser-session model for driver profiles, facility appointments, tasks, and settings/document mutations before any production integration.
