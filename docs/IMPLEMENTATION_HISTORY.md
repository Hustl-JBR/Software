# Implementation history

## 2026-08-02: Reviewable staging simplification

- Renamed the command-center experience to Today and reduced primary navigation to Today, Quotes, Loads, Customers, Carriers, and Money, with Settings moved into the user menu.
- Reduced Today to Needs Attention (maximum five), today’s pickups and deliveries, quotes waiting, and recent activity; vague review labels were replaced with the task an employee must perform.
- Removed Facilities and Google mapping/provider states from the active employee experience. Stop locations remain manual/reusable records, with optional stored mileage and an external OpenStreetMap link.
- Kept existing load-operation sections and their navigation tabs rather than introducing an architecture rewrite.

## 2026-08-02: Claude-report recovery and employee-operations simplification

Claude's reported branch, commits, bundle, and patch were unavailable after local, attachment, object, branch, and fetched-remote checks. A dedicated Codex branch recreated the approved behaviors without claiming exact recovery. The milestone makes explicit role rows authoritative, sanitizes operator errors and malformed identifiers, removes fabricated staging analysis, expands reviewed equipment support, annotates PostgreSQL timestamp intent, introduces normal dollar entry, blocks impossible DRAFT/physical-tracking combinations, creates `/operations`, isolates administrator tools, moves actions to their records, translates activity language, and raises employee UI readability. New migrations are narrow and contain no timestamp rewrite. Verification and deployment results are recorded separately as they complete.

Commits `189b3b8`, `d5563e0`, and `6df3de8` were pushed to `codex/integrate-claude-review`; draft PR #2 targets the existing Atlas development branch. Railway staging deployment `0917b316-2370-4fa6-a57d-57d624ead488` succeeded with both forward migrations, 29 PostgreSQL integration tests, guarded seed/auth/isolation checks, persistence confirmation, and a healthy database-backed application. Local verification passed formatting, ESLint, TypeScript, build, 46 unit tests, 12 demo browser tests, and the six-width visual/console audit.

1. Repository foundation established product, architecture, security, testing, and phased-roadmap documentation.
2. The first vertical slice implemented tenant-scoped shipment intake, deterministic extraction, immutable correction revisions, exact approval, draft load/stops, and audit history.
3. Verification hardening added CI, PostgreSQL 16 configuration, integration/E2E coverage, safe errors, seed guards, and local setup.
4. Demo mode added an environment-gated in-memory path so the slice can run without authentication or PostgreSQL while leaving production behavior intact.
5. The approved visual redesign introduced the dark Atlas shell, operations command center, AI analysis, grouped review, stop cards, and mission timeline. Commit `7402aaf` preserves this foundation.
6. Active-load operations added 12 connected loads, attention, tracking simulation, delay propagation, exceptions, communications, pricing, sourcing, and financials. Commit `8057364` preserves this phase.
7. Navigation stabilization made all sidebar routes functional, added active-route styling, loading/error/not-found states, global Tracking, Network, Documents, Analytics, and Settings workspaces, carrier profiles, and masked load contacts.
8. Demo safety boundaries added audited contact reveals, logged call outcomes, tracking-interruption attention, and hard carrier-selection blocks for authority, insurance, do-not-use, and cargo-coverage failures. Automated demo navigation and privacy coverage was added in Playwright.
9. The approved four-commit demo baseline through `9a178c7` was pushed to `origin/codex/create-initial-documentation-and-project-plan`. Pull request [#1](https://github.com/Hustl-JBR/Software/pull/1) was updated with the verified demo scope and converted to draft as the persistent-staging transition point.
10. Freight-domain terminology was corrected permanently: Atlas selects and approves a carrier or owner-operator business first; the carrier assigns a driver afterward. Carrier selection and driver assignment remain separate concepts, and Atlas is not a driver-recruiting marketplace.
11. The persistent staging foundation added Better Auth credential accounts and database sessions, active-user checks, multiple organization roles, guarded four-account synthetic seeding, a health route, and an isolated PostgreSQL-backed operations workspace.
12. The staging domain model now persists customer calls, quote approval/acceptance, manual carrier candidates and hard qualification blocks, carrier selection, driver/dispatcher assignment, stop confirmation, load ownership/next action, manual tracking, communications, tasks, and append-only audit events. Consequential commands use idempotency and quote approval enforces separation of duties.
13. Railway deployment, environment-variable, infrastructure, cost, backup/recovery, rollback, and teardown documentation was added before provisioning.
14. Railway's dependency security gate blocked the inherited Next.js 15.4.5 baseline before execution; Atlas upgraded to the patched Next.js 15.4.10 maintenance release without changing demo or staging behavior.
15. An isolated private `Project Atlas` Railway project was provisioned with only one `staging` environment, one public web service, and one private persistent PostgreSQL service. No existing Railway project or service was modified or reused.
16. Railway pre-deploy gates applied both Prisma migrations, passed 25 PostgreSQL integration tests, seeded four synthetic accounts, completed two Better Auth sign-ins, verified shared organization visibility and tenant isolation, initialized a persistent synthetic shipment, and confirmed it survived a second deployment. The public health probe reports the database reachable.
17. The legacy disposable E2E seed was updated for Better Auth credentials, while the PostgreSQL-only intake browser test is excluded from browser-only demo runs. The final demo suite passes 12 tests with that one persistent test skipped.

Final verification includes formatting, lint, strict type checking, 22 unit tests, 12 demo browser tests, a demo production build, two clean Railway deployments, 25 PostgreSQL integration tests per deployment, two authenticated synthetic users, cross-organization denial, persistent data across redeployment, and a healthy public endpoint.

# 2026-08-02 — Facilities and routing foundation

- Created `codex/facilities-routing-foundation` from frozen PR #2 head `7f09f18`; PR #2 remains unchanged.
- Added organization-scoped facilities and contacts, immutable load-stop location/time-zone snapshots, route snapshots, provider usage metadata, composite tenant foreign keys, and an additive migration.
- Added manual and Google location adapters, deterministic provider mocks, authenticated/debounced/rate-limited autocomplete and resolution routes, a Network facility directory, shipment facility selection, and load-stop attachment.
- Added DST-safe facility-local appointment conversion with explicit overlap disambiguation and gap rejection.
- Added provider-neutral route calculation, persistent cache hashing, honest general-road warnings, Google map rendering only with a browser key, and disabled fallback without credentials.
- Added focused domain/provider/schema tests and the facility, time-zone, provider, Google setup, cost-control, and commercial-routing documentation set.
