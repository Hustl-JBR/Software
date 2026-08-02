# Provider-neutral architecture

External capabilities sit behind typed ports: `LoadBoardProvider`, `CarrierComplianceProvider`, `TrackingProvider`, `MessagingProvider`, `DocumentStorageProvider`, and `AccountingProvider`. Domain commands consume normalized evidence objects carrying provider, observed-at time, freshness, source reference, and uncertainty/failure state.

Adapters must not write authoritative domain state directly. Commands validate tenant and actor, apply invariants/idempotency, persist the decision/evidence, and audit it. Manual providers remain first-class fallbacks. Provider-specific IDs stay at the integration boundary.
