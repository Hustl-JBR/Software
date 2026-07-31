# Database entity and relationship plan

## Modeling conventions

- Tenant-owned tables contain non-null `organization_id`; unique constraints include it.
- Primary keys are opaque. Human reference numbers are separately scoped to an organization.
- Mutable aggregates contain `created_at`, `updated_at`, and `version`; soft deletion is used only where retention and uniqueness semantics are defined.
- Money uses `*_cents BIGINT` plus `currency CHAR(3)`. Rates use integer basis points or fixed-precision numeric—not floats.
- All instants are UTC. Stop windows also store IANA time zone and local input.
- Status fields map to explicit enums/state machines. Flexible JSON is reserved for versioned snapshots/provider payloads, not core searchable fields.

## Identity and tenancy

- **Organization** has many memberships, customers, carriers, facilities, loads, and policies.
- **User** is a global authenticated principal.
- **Membership** joins user to organization with lifecycle status; has many **MembershipRole** rows.
- **Role** is organization-scoped (plus immutable system templates) and has many **RolePermission** rows.
- **Permission** is an application-defined action string. Resource-level conditions remain in policy code.
- **Invitation** records invitee, intended roles, expiry, issuer, and acceptance.

No operational row is authorized merely because a user knows its ID. Every access resolves an active membership in the row's organization.

## Parties and locations

- **Customer** belongs to an organization; has lifecycle/credit status, contacts, facilities, loads, and invoices.
- **Carrier** belongs to an organization; stores operational identity and internal status, not a claim of official eligibility.
- **CarrierIdentifier** stores typed identifiers and verification source/status.
- **Contact** belongs to an organization and may be linked through typed join tables to customers, carriers, or facilities.
- **Facility** contains address, geocode provenance, IANA time zone, hours/instructions, and customer associations.
- **ComplianceCheck** belongs to a carrier, records check type, source adapter, observed facts, checked/expiry times, result, and immutable evidence snapshot.

## Intake, quote, and load execution

- **ShipmentIntake** stores source type, raw-content reference or protected text, parse status, schema version, and submitter.
- **IntakeExtraction** is an immutable AI/manual run containing structured candidates, confidence/provenance by field, issues, model/prompt versions, and validation status.
- **IntakeIssue** identifies missing/conflicting/ambiguous/invalid data and resolution evidence.
- **Quote** belongs to customer and optionally intake/load; has many immutable **QuoteRevision** records.
- **QuoteRevision** snapshots lanes, charges, assumptions, market input, pricing-rule version, risk indicators, totals, expiry, and approval state.
- **PricingRuleSet** and **MarketRateInput** are versioned, effective-dated, and preserve author/source.
- **Load** belongs to customer, optionally originates from an approved intake/quote, and owns current lifecycle status and commercial snapshot references.
- **LoadStop** belongs to a load, has unique sequence, pickup/delivery/other type, facility/address snapshot, appointment mode/window, and instructions.
- **LoadReference** stores typed external/customer references unique as appropriate.
- **LoadAssignment** records internal ownership history.
- **LoadStatusTransition** appends from/to status, command, actor, reason, version, and time.

Facility/address snapshots on loads prevent later master-data edits from rewriting historical shipment facts.

## Capacity, tracking, communications, and exceptions

- **CarrierOffer** belongs to a load/carrier and records quoted cost, terms, validity, source, and state.
- **CarrierBooking** references one approved offer, carrier, approval, rate-confirmation artifact, and acceptance evidence. Only one active booking per load is permitted.
- **TrackingEvent** is append-only, with event type, occurred/received times, stop, source, location, and deduplication key.
- **Milestone** represents expected/actual operational moments and status.
- **ExceptionCase** records type, severity, owner, evidence, status, and resolution approval where required.
- **CommunicationThread**, **CommunicationMessage**, and immutable **CommunicationDraftRevision** retain participants, channel, provider reference, delivery state, and approval link. Sending is a separate idempotent command.

## Documents and finance

- **Document** stores owner linkage, type, object key, original name, media type, bytes, checksum, uploader, scan status, and retention class.
- **DocumentVersion** permits replacement without erasing history.
- **DocumentExtraction** stores versioned candidates and reconciliation status; extracted fields do not overwrite approved facts.
- **Charge** is a typed, signed monetary line tied to load and payer/payee side, with proposed/approved/disputed status and evidence.
- **CustomerInvoice** and **CustomerInvoiceLine** snapshot approved receivable charges and lifecycle; issuance needs approval.
- **CarrierBill** and **CarrierBillLine** snapshot payable claims and matching results; approval is distinct from payment.
- **PaymentRecord** records a payment observed or manually approved for later adapter execution; no autonomous execution in initial scope.
- **ReconciliationResult** compares document claims, approved charges, and tolerances, producing explainable discrepancies.

## Governance and reliability

- **ApprovalRequest** references a typed subject ID, action, requester, policy snapshot, state, expiry, and reason.
- **ApprovalDecision** appends approver, decision, rationale, and time. Constraints prevent duplicate active approvals and enforce separation of duties where configured.
- **AiRun** records purpose, schema/prompt/model/provider versions, redacted input/output references, token/cost metadata, validation result, and correlation ID.
- **AiRecommendation** stores structured proposed action, evidence links, risk flags, disposition, and reviewer.
- **AuditEvent** is append-only with organization, actor type/ID, action, resource, timestamp, correlation/causation IDs, request metadata, reason, and redacted before/after summaries.
- **IdempotencyRecord** uniquely keys organization + command + key and stores request hash, execution status, and response reference.
- **OutboxEvent** stores typed payload, aggregate/version, availability, attempts, and delivery state.

## Relationship summary

```text
Organization 1--* Membership *--1 User
Membership *--* Role *--* Permission
Organization 1--* Customer 1--* Load 1--* LoadStop
ShipmentIntake 1--* IntakeExtraction 1--* IntakeIssue
Customer 1--* Quote 1--* QuoteRevision
Load 1--* CarrierOffer; Carrier 1--* CarrierOffer
Load 1--0..1 active CarrierBooking *--1 Carrier
Load 1--* TrackingEvent / Milestone / ExceptionCase / Charge / Document
Approved Charge *--* InvoiceLine or CarrierBillLine (through explicit allocation)
ApprovalRequest 1--* ApprovalDecision
Every major aggregate 1--* AuditEvent (polymorphic typed reference)
```

## Critical database constraints

- Composite foreign keys should include `organization_id` where feasible, preventing cross-tenant relationships.
- Unique active carrier booking per load; unique stop sequence per load; unique human number per organization/type.
- Appointment end cannot precede start; weights/pallets must be nonnegative and bounded; currency must match across a calculation.
- Approved/issued records are immutable revisions; changes create a revision or adjustment.
- Audit events and status transitions cannot be updated/deleted by the application role.
- Polymorphic subject references require application validation plus database triggers or a subject registry if strict FK integrity is needed.

## Retention and deletion

Retention periods, legal holds, customer deletion rights, and financial/audit record requirements are unanswered. Until policy is approved: minimize raw AI content, separate object lifecycle from metadata, prohibit destructive operational deletion, and make administrative erasure a reviewed, audited process.
