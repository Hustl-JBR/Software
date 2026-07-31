# Integration strategy

## Policy

No external service behavior is assumed. Until official documentation, contracts, sandbox access, credentials, rate limits, security/privacy review, and failure semantics are available, Atlas uses typed adapter interfaces and deterministic in-memory or fixture-backed mocks. Mock behavior must be labeled and must not imply vendor certification.

## Adapter shape

Each adapter defines versioned Zod request/response contracts, capability flags, stable internal error taxonomy, timeouts/cancellation, vendor-reference mapping, idempotency semantics, retry classification, webhook verification/deduplication, observability/redaction, and a deterministic fake. Provider payloads stay at the boundary; domain modules receive normalized values plus provenance.

Side-effecting calls originate from the transactional outbox, not an open database transaction. Consumers assume at-least-once delivery and deduplicate on organization + operation key. Unknown outcomes enter reconciliation/manual review rather than blind retry.

## Planned interfaces (not implementations)

- `IdentityProvider`: session identity and lifecycle hooks; authorization remains Atlas-owned.
- `ObjectStore`: put/get metadata, short-lived signed access, delete under retention policy; scanning is separate.
- `MalwareScanner`: scan result and engine/signature provenance.
- `AiStructuredWorkflow`: schema-bound extraction/recommendation; no domain mutation tools.
- `JobQueue`: enqueue/lease/retry/dead-letter with stable job keys.
- `EmailGateway` / `SmsGateway`: draft delivery, status/webhook verification, recipient and provider IDs.
- `TrackingProvider`: subscription/poll and normalized events; never fabricate carrier events.
- `MappingProvider`: validated geocode/distance result with source and confidence; manual fallback.
- `CarrierComplianceProvider`: observed facts and timestamps only; Atlas policy determines eligibility and humans approve overrides.
- `AccountingAdapter`: export invoices/bills and reconcile external references.
- `PaymentAdapter` (future): preparation/status only until separately authorized; no autonomous execution.

## Integration readiness checklist

For each provider document data ownership/residency/retention, authentication and secret rotation, official request/response/webhook schemas, sandbox differences, rate limits, idempotency guarantees, retryable errors, ordering/duplication, SLAs, cost limits, support/escalation, reconciliation, backfill/export, deletion, and exit plan. Complete threat modeling and contract/privacy review before production data is sent.
