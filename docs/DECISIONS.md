# Decisions

- Demo mode remains isolated from production behavior and is enabled only by `ATLAS_DEMO_MODE=true`.
- The PostgreSQL/Prisma backend remains intact; demo operations do not write it.
- Atlas may analyze, prioritize, recommend, and draft. Consequential quotes, carrier selection, sensitive-data access, compliance overrides, and external communications require human approval.
- External services will use typed adapters and verified provider documentation. No provider is simulated as connected.
- Synthetic tracking is explicitly labeled and never presented as GPS, map-provider, traffic-provider, or ELD data.
- Driver tracking is shipment-limited. Contact data is masked by default and reveal events must be auditable before production use.
- Browser-session demo state is acceptable for design validation; server restart/session clearing may reset it.
- Money in production uses integer minor units. Demo presentation may display calculated values but must not be reused as accounting logic.
- Every meaningful change updates `CURRENT_STATE.md` and `IMPLEMENTATION_HISTORY.md`.
- Staging authentication uses maintained Better Auth email/password credentials with its Prisma adapter, server-validated eight-hour database sessions, disabled public sign-up, and Atlas-owned organization membership/authorization. No email provider is connected.
- Staging uses one isolated Railway web service plus one private PostgreSQL service. No production environment, Redis, worker, cron, object storage, custom domain, or third-party freight provider is authorized.
- Multiple employee roles are additive organization-membership role rows. The legacy primary role remains for compatibility during this milestone; authorization evaluates the union server-side and role changes are audited.
- Carrier qualification in staging records a human-entered assertion only. It never claims FMCSA or insurer verification, and unconfirmed authority/insurance or insufficient synthetic cargo coverage is blocked.
- Staging deployment is fail-closed: migrations, PostgreSQL integration tests, the guarded synthetic seed, and the guarded two-user persistence/isolation check all run before a web release is promoted.
