# Infrastructure

## Railway staging topology

Atlas uses one isolated private Railway project named `Project Atlas` (`8c53093a-edf1-44bf-ad2d-36c81f177252`) in workspace `jbready88-alt's Projects`. Its only environment is `staging` (`909ec8d9-b384-4073-9784-00398f4dca5b`). It does not reuse or reference services, variables, databases, or Redis instances from any other Railway project.

| Resource                                                             | Environment | Reachability                                                       | Purpose                                                                                     |
| -------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `divine-purpose` (Atlas web, `b39b4330-8a5b-40d6-ae6b-77de5dce53ba`) | `staging`   | Public only at `https://divine-purpose-staging.up.railway.app`     | Next.js UI, Better Auth endpoints, server actions, and `/api/health`                        |
| `Postgres` (`9833b6c6-ce33-48e5-911b-e892811804e1`)                  | `staging`   | Railway private endpoint `postgres` only; no service/custom domain | Durable authentication, organization, workflow, task, and audit data on a persistent volume |

No production environment, Redis, worker, cron, bucket, custom domain, public database endpoint, or third-party provider is part of this milestone. The generated Railway service name could not be renamed through the connected API; its purpose and immutable service ID are documented above.

## Cost exposure

Both the continuously running web service and PostgreSQL service are usage-billed. Railway currently documents RAM at $10/GB/month, CPU at $20/vCPU/month, volume storage at $0.15/GB/month, and egress at $0.05/GB. Hobby includes $5/month of usage within its $5 base subscription; Free includes $1/month of credit. The connected tool does not expose this account's plan or remaining allowance, so no free allowance is assumed.

A small, lightly used two-service staging stack may remain within an included credit, but the exact monthly amount depends on measured CPU/RAM uptime. Review Railway usage after 24 hours and configure account-level spend controls in the Railway dashboard. Private database traffic avoids public egress.

## Deletion and exposure controls

- The web domain is the only authorized public endpoint.
- PostgreSQL must not have a generated domain or TCP proxy/public URL.
- Deleting the `Project Atlas` Railway project from its Danger settings removes all Atlas services, environments, deployments, and data. This is irreversible.
- Before teardown, preserve any required synthetic evidence with an approved private backup method; then delete the whole isolated project rather than individual shared resources.
