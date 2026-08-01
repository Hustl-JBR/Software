# Environment variables

Secret values belong in Railway variables or a local untracked `.env`; never commit or print them.

| Name                        | Required in staging             | Purpose                                                                                  |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Yes                             | Private Railway reference to the Atlas PostgreSQL service (`${{Postgres.DATABASE_URL}}`) |
| `BETTER_AUTH_SECRET`        | Yes, secret                     | Independent Atlas-only key used by Better Auth; at least 32 random characters            |
| `BETTER_AUTH_URL`           | Yes                             | Exact Railway-generated HTTPS origin for authentication callbacks and cookies            |
| `ATLAS_DEMO_MODE`           | Yes                             | `false` in staging; only literal `true` enables the browser-only demo                    |
| `NODE_ENV`                  | Yes                             | `production` in Railway                                                                  |
| `SEED_STAGING_DATA`         | During staging seed             | Must be `true` for the guarded synthetic seed command                                    |
| `ATLAS_SEED_PASSWORD_ALEX`  | During staging seed, secret     | Initial password for the synthetic Alex account                                          |
| `ATLAS_SEED_PASSWORD_BLAIR` | During staging seed, secret     | Initial password for the synthetic Blair account                                         |
| `ATLAS_SEED_PASSWORD_CASEY` | During staging seed, secret     | Initial password for the synthetic Casey account                                         |
| `ATLAS_SEED_PASSWORD_DEVON` | During staging seed, secret     | Initial password for the synthetic Devon account                                         |
| `SESSION_SECRET`            | Local legacy compatibility only | Fallback accepted by the auth configuration; staging uses `BETTER_AUTH_SECRET`           |
| `SEED_DEVELOPMENT_DATA`     | Local only                      | Guards the legacy disposable development seed                                            |

The four password variables must contain distinct values of at least 12 characters. The seed never logs them and does not overwrite an existing credential account on redeploy.
