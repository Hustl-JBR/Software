# Railway infrastructure

Authorized Atlas staging resources:

- Project: `Project Atlas` (`8c53093a-edf1-44bf-ad2d-36c81f177252`).
- Environment: `staging` (`909ec8d9-b384-4073-9784-00398f4dca5b`).
- Web service: `divine-purpose`.
- URL: `https://divine-purpose-staging.up.railway.app`.
- Database: the existing private Railway `Postgres` service and volume.

No production environment, second database, Redis, worker, cron, domain, TCP proxy, or storage service is authorized. Better Auth and the application share the existing private PostgreSQL database.

The pre-deploy gate runs checked-in forward migrations, integration tests, guarded synthetic seed, and persistence/isolation verification before promotion. Recovery requires recording a known persisted synthetic identifier, applying the reviewed migrations, deploying, checking `/api/health`, authenticating, confirming existing records/role revocation, and confirming that identifier survives a redeploy. Never disclose Railway variables.

Rollback is application-first: redeploy the last known-good build and use a reviewed forward repair migration if required. Never run destructive down migrations or `prisma migrate dev` on staging.
