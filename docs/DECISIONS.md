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
