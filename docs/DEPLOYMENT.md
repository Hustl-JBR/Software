# Deployment

## Railway staging

- Repository: `Hustl-JBR/Software`
- Branch: `codex/create-initial-documentation-and-project-plan`
- Environment: `staging`
- Builder: Railway Railpack/Nixpacks-compatible Node 22 workspace build
- Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm db:generate && corepack pnpm --filter @atlas/web build`
- Pre-deploy command: `corepack pnpm db:deploy && corepack pnpm exec vitest run tests/integration && corepack pnpm db:seed:staging && corepack pnpm db:verify:staging`
- Start command: `corepack pnpm --filter @atlas/web start`
- Health-check path: `/api/health`

The recovery branch is deployed to this existing service only after formatting, lint, type checking, unit/integration tests, build, and migration review pass. Never run `prisma migrate dev` against Railway. The checked-in equipment migration adds `equipment_detail` and broadens the constraint; the status-repair migration only reclassifies contradictory synthetic tracking rows. Existing timestamp columns are already `TIMESTAMPTZ` and no recovery migration changes their types.

Recovery deployment `0917b316-2370-4fa6-a57d-57d624ead488` succeeded on 2026-08-02. It applied migrations `20260802000100_equipment_types` and `20260802000200_status_consistency`, passed 29 PostgreSQL integration tests, seeded without printing credentials, confirmed two sign-ins/shared access/cross-organization denial/persistence, and passed `/api/health`. Railway deployed exact commit `6df3de8` on request, but its connected source configuration still reports the existing development branch; no persistent source-branch change is claimed. All other resources and configuration were preserved.

The database reference must use Railway private networking. Do not configure `DATABASE_PUBLIC_URL`, a TCP proxy, or a custom database domain.

## Migration and seed process

`corepack pnpm db:deploy` applies checked-in Prisma migrations. Migrations run before integration tests and the idempotent, guarded synthetic seed. A failed migration, integration test, or seed blocks the new web deployment.

The staging seed creates four clearly synthetic accounts in one `atlas-staging` organization. The verification command signs in as Alex and Blair through Better Auth, checks shared organization visibility and cross-organization denial, and creates or confirms an idempotent synthetic persistence shipment. Public sign-up is disabled. To add real employees later, an administrator must use a reviewed account-provisioning command that creates an individual credential, active organization membership, explicit role rows, and an audit event; never edit database rows manually or share a password.

## Staging login

Open `https://divine-purpose-staging.up.railway.app/sign-in`, enter one synthetic email listed in `CURRENT_STATE.md`, and use the corresponding password stored in that service's Railway variable. Password values are intentionally absent from Git and documentation. Successful login routes the employee to the shared `atlas-staging` organization.

## Rollback

1. Redeploy the last known-good Railway web deployment or commit.
2. Do not run destructive down migrations. Database migrations are forward-only.
3. If a schema change is incompatible, deploy a reviewed forward repair migration before reverting application behavior.
4. Confirm `/api/health`, login, organization scope, and a known persistent synthetic record after rollback.

Recovery plan: redeploy the last known-good web deployment. Because both recovery migrations are forward-compatible, do not down-migrate; if application rollback exposes a mismatch, ship a reviewed forward repair. Record the known synthetic persistence load before deployment and verify the same identifier after redeployment.

## Local demo

```powershell
corepack pnpm install --frozen-lockfile
$env:ATLAS_DEMO_MODE="true"
$env:SESSION_SECRET="a-local-synthetic-secret-at-least-32-characters"
$env:BETTER_AUTH_URL="http://localhost:3000"
corepack pnpm --filter @atlas/web dev
```

Open `http://localhost:3000/org/atlas-north`. Demo mode requires no PostgreSQL and does not use Better Auth.

## Safe teardown

Confirm the exact Railway project name and ID are Atlas-specific, capture any authorized backup, then delete the entire isolated `Project Atlas` project from Railway project settings. Never delete or modify the four pre-existing non-Atlas Railway projects.
