# Infrastructure

## Railway staging topology

Atlas uses one isolated Railway project named `Project Atlas`. It must not reuse or reference services, variables, databases, or Redis instances from any other Railway project.

| Resource   | Environment | Reachability                          | Purpose                                                              |
| ---------- | ----------- | ------------------------------------- | -------------------------------------------------------------------- |
| Atlas web  | `staging`   | Railway-generated public HTTPS domain | Next.js UI, Better Auth endpoints, server actions, and `/api/health` |
| PostgreSQL | `staging`   | Railway private network only          | Durable authentication, organization, workflow, task, and audit data |

The exact Railway project/service IDs and generated domain are recorded after provisioning. No production environment, Redis, worker, cron, bucket, custom domain, or third-party provider is part of this milestone.

## Cost exposure

Both the continuously running web service and PostgreSQL service are usage-billed. Railway currently documents RAM at $10/GB/month, CPU at $20/vCPU/month, volume storage at $0.15/GB/month, and egress at $0.05/GB. Hobby includes $5/month of usage within its $5 base subscription; Free includes $1/month of credit. The connected tool does not expose this account's plan or remaining allowance, so no free allowance is assumed.

A small, lightly used two-service staging stack may remain within an included credit, but the exact monthly amount depends on measured CPU/RAM uptime. Review Railway usage after 24 hours and configure account-level spend controls in the Railway dashboard. Private database traffic avoids public egress.

## Deletion and exposure controls

- The web domain is the only authorized public endpoint.
- PostgreSQL must not have a generated domain or TCP proxy/public URL.
- Deleting the `Project Atlas` Railway project from its Danger settings removes all Atlas services, environments, deployments, and data. This is irreversible.
- Before teardown, preserve any required synthetic evidence with an approved private backup method; then delete the whole isolated project rather than individual shared resources.
