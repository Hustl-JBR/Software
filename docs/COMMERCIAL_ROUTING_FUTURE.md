# Commercial routing future

Commercial/truck-legal routing is not implemented. Google `DRIVE` results are general road estimates and must never be used for bridge clearance, vehicle dimensions, weight limits, hazmat restrictions, permit routing, hours-of-service, fuel/toll planning, or legal-road decisions.

A future commercial adapter must be separately contracted, documented, credentialed, and approved. It must accept explicit vehicle dimensions/weights/axles, commodity and hazmat context, jurisdictional restrictions, and provider policy/version; return warnings and unsupported constraints; preserve immutable request/result evidence; expose data freshness; pass deterministic contract tests; and use the distinct `COMMERCIAL_ROUTE` type.

Do not relabel Google estimates, use “truck optimized,” mention PC\*Miler as connected, or infer commercial suitability from equipment labels. Provider comparison and procurement are a future phase.
