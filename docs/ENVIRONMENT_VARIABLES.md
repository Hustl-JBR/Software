# Environment variables

## Optional maps/location/routing

- `ATLAS_LOCATION_PROVIDER=google` enables the server-side Google Places adapter only when `GOOGLE_MAPS_SERVER_API_KEY` is also set.
- `ATLAS_ROUTE_PROVIDER=google` enables the server-side Google Routes adapter only when `GOOGLE_MAPS_SERVER_API_KEY` is also set.
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is the referrer- and API-restricted browser key for Maps JavaScript API. It is public by design and must not be reused server-side.
- `GOOGLE_MAPS_SERVER_API_KEY` is the restricted server-only Places/Routes key. Never expose it through a `NEXT_PUBLIC_` name.

All four variables may remain empty. Atlas then exposes manual facility entry, disables provider route calculation, and shows a map-unavailable state. See `GOOGLE_MAPS_SETUP.md` and `MAPS_COST_CONTROLS.md` before activation.

Secret values belong in Railway variables or a local untracked `.env`; never commit or print them.

| Name                              | Required in staging             | Purpose                                                                                  |
| --------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Yes                             | Private Railway reference to the Atlas PostgreSQL service (`${{Postgres.DATABASE_URL}}`) |
| `BETTER_AUTH_SECRET`              | Yes, secret                     | Independent Atlas-only key used by Better Auth; at least 32 random characters            |
| `BETTER_AUTH_URL`                 | Yes                             | Exact Railway-generated HTTPS origin for authentication callbacks and cookies            |
| `ATLAS_DEMO_MODE`                 | Yes                             | `false` in staging; only literal `true` enables the browser-only demo                    |
| `NODE_ENV`                        | Yes                             | `production` in Railway                                                                  |
| `SEED_STAGING_DATA`               | During staging seed             | Must be `true` for the guarded synthetic seed command                                    |
| `VERIFY_STAGING_DATA`             | During staging verification     | Must be `true` for the guarded two-user auth, isolation, and persistence self-check      |
| `ATLAS_SEED_PASSWORD_ALEX`        | During staging seed, secret     | Initial password for the synthetic Alex account                                          |
| `ATLAS_SEED_PASSWORD_BLAIR`       | During staging seed, secret     | Initial password for the synthetic Blair account                                         |
| `ATLAS_SEED_PASSWORD_CASEY`       | During staging seed, secret     | Initial password for the synthetic Casey account                                         |
| `ATLAS_SEED_PASSWORD_DEVON`       | During staging seed, secret     | Initial password for the synthetic Devon account                                         |
| `SESSION_SECRET`                  | Local legacy compatibility only | Fallback accepted by the auth configuration; staging uses `BETTER_AUTH_SECRET`           |
| `SEED_DEVELOPMENT_DATA`           | Local only                      | Guards the legacy disposable development seed                                            |
| `ATLAS_DEVELOPMENT_SEED_PASSWORD` | Local/CI only                   | Shared synthetic credential used only by the disposable local PostgreSQL E2E seed        |

The four password variables must contain distinct values of at least 12 characters. The seed and verification commands never log them, and the seed does not overwrite an existing credential account on redeploy.
