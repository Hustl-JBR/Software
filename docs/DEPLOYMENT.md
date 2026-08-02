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
