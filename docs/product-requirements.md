# Product requirements

## Vision and initial objective

Atlas should eventually coordinate freight from request through settlement with minimal manual effort. The initial objective is narrower: give a small internal team one reliable, auditable workspace for domestic US FTL dry-van shipments while humans retain every consequential decision.

## Personas

- **Operations coordinator:** reviews intake, maintains loads and stops, monitors milestones, gathers documents, and handles exceptions.
- **Sales/pricing user:** maintains customer context and market inputs, prepares quotes, and requests approval.
- **Approver/manager:** approves quotes, carriers, sensitive exceptions, invoices, bills, and overrides.
- **Finance user:** reconciles approved charges and prepares receivables/payables for approval.
- **Compliance user:** reviews carrier eligibility and warnings; no automated override is allowed.
- **Organization administrator:** manages members, roles, policies, and organization configuration.
- **Auditor/read-only user:** reviews records and audit evidence without operational mutations.
- **Customer/carrier contact (later):** communicates through controlled channels; no initial self-service portal is assumed.

## In-scope operating workflow

1. Capture a structured form or plain-English shipment request and its source.
2. Extract candidate origin, destination, pickup/delivery windows, commodity, weight, pallet count, equipment, appointments, and special instructions.
3. Mark missing, ambiguous, or conflicting data; never silently guess required facts.
4. Let an authorized human correct and approve intake.
5. Recommend a quote from manually entered market data, explicit pricing rules, target margin, and risk indicators.
6. Require quote approval before a communication can be sent.
7. After documented customer acceptance, let a human approve carrier selection.
8. Record customer price, carrier cost, expected gross profit, and margin with reproducible calculation inputs.
9. Create load, stop, booking, and draft communication records.
10. Record milestones and flag suspected delays for review.
11. Collect BOL, POD, carrier invoice, and receipt files with metadata and extraction status.
12. compare submitted charges to approved charges and route mismatches to an exception.
13. Prepare—but do not autonomously issue—customer invoices and carrier payment information.
14. Append audit evidence for all major actions.

## Functional requirements by capability

- **Identity and tenancy:** secure login, organization membership, scoped roles, invitations, session revocation, and tenant-isolated records.
- **CRM:** customers, carriers, contacts, facilities, notes, and status histories.
- **Execution:** loads, ordered stops, appointments, references, tracking events, exceptions, and operational ownership.
- **Commercial:** versioned quotes, manual market inputs, pricing calculations, carrier offers/bookings, approved charges, margin snapshots, invoices, and bills.
- **Content:** communication drafts, message history, document metadata, malware-scan status, extraction candidates, and reconciliation results.
- **Governance:** approval requests, compliance checks, AI runs/recommendations, idempotency records, and immutable audit entries.

## Non-functional requirements

- Deny cross-organization access even when identifiers are guessed.
- Preserve a clear actor, timestamp, reason, before/after summary, correlation ID, and source for major changes.
- Use integer cents and explicit currency; percentages use integer basis points or fixed-precision decimals.
- Use UTC instants plus facility IANA time zones; retain original local appointment input.
- Make consequential commands retry-safe and atomic with their audit/outbox writes.
- Encrypt data in transit and at rest; isolate private documents and use short-lived signed access.
- Provide accessible workflows, keyboard operation, actionable validation, and observable background jobs.
- Establish recovery objectives before production; proposed starting targets are RPO <= 15 minutes and RTO <= 4 hours, subject to approval.

## Explicitly out of scope initially

Polished public portals, other transport modes/equipment workflows, route optimization, autonomous decisions, autonomous payments, autonomous booking, autonomous claims, unrestricted agents, EDI/API integrations, real-time telematics, accounting-system sync, and invented compliance/vendor behavior.

## Success measures for the first release

- Intake-to-reviewed-draft completion rate and median review time.
- Percentage of required fields complete before approval.
- Authorization/tenant-isolation test pass rate (target 100%).
- Consequential actions with audit and idempotency coverage (target 100%).
- AI extraction field accuracy and issue-recall on an approved, de-identified evaluation set.
- Duplicate execution incidents and unauthorized cross-tenant disclosures (target zero).

## Assumptions

- Initial operations are US domestic FTL dry van, usually one pickup and one delivery, but the model permits multiple ordered stops.
- Atlas is a system of workflow record; legal/accounting systems of record will be selected later.
- Internal users manually enter market and tracking information at first.
- English and USD are initial UI defaults, while data structures retain explicit locale/currency.
- A load belongs to exactly one organization and one customer account; facilities and contacts may be reused.
- Documents may contain sensitive commercial and personal data and require private storage.

## Risks

- Brokerage licensing, insurance, carrier onboarding, sanctions, tax, record-retention, and payment rules need qualified legal/compliance review.
- Incorrect AI extraction, stale market inputs, fraud, double brokering, identity compromise, document malware, and prompt injection can cause financial or safety harm.
- Ambiguous ownership between quote, load, invoice, and accounting records can create reconciliation errors.
- Over-modeling too early can slow learning; under-modeling approvals and audit can create irreversible control gaps.
- Tracking depends on uncertain data quality and vendor contracts.

## Unanswered business questions

1. Is Atlas operating as broker, carrier, shipper agent, or another legal role, and in which jurisdictions?
2. What constitutes customer quote acceptance and carrier booking acceptance (email, signature, portal action)?
3. Which roles may approve which decisions, and what dollar/margin thresholds require a second approver?
4. Can the requester approve their own action? The recommended default is no for high-risk actions.
5. What carrier qualification evidence, freshness windows, insurance limits, and compliance vendors are required?
6. How are detention, layover, lumper, TONU, fuel, and other accessorials requested, evidenced, and approved?
7. Which pricing rules, risk factors, margin floors, credit limits, and override reasons apply?
8. What are load-number, quote-number, invoice-number, and retention requirements?
9. What tracking cadence, milestone definitions, and escalation SLAs are promised to customers?
10. Which documents are legally required, who owns them, and how long must each class be retained?
11. Which accounting, payment, email/SMS, mapping, tracking, identity, storage, and compliance vendors will be selected?
12. Are multi-currency, taxes, factoring, quick pay, partial shipments, team brokerage, or multi-branch operations needed?
13. What data may be sent to an AI provider, what redaction/retention terms apply, and is customer consent required?
14. What recovery, availability, security certification, and incident-notification commitments are contractual?
