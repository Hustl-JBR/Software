# Shipment lifecycle

Use a small authoritative load state machine plus orthogonal readiness, physical evidence, and exceptions. The current persistent state is DRAFT. Future states should be added only when the business event, invariant, authorized actor, required evidence, rollback/repair behavior, and reporting meaning are agreed.

Physical position (pickup, transit, delivery) and exceptions (delay, tracking lost, appointment risk) are distinct. An exception never erases position. DRAFT cannot claim a physical milestone. Every transition is tenant-scoped, idempotent, reasoned, and historized.
