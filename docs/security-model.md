# Security and permissions model

## Security objectives

Prevent cross-organization disclosure, unauthorized consequential actions, account takeover, duplicate execution, document abuse, and untraceable changes. Controls are deny-by-default, server-side, least-privilege, and auditable.

## Authentication and session requirements

Select a maintained authentication solution by ADR; do not build password cryptography. Require verified email, phishing-resistant MFA for privileged users (prefer passkeys/WebAuthn), secure `HttpOnly`/`Secure`/`SameSite` cookies, CSRF protection where applicable, session rotation, bounded idle/absolute lifetimes, revocation, rate limits, and recent re-authentication for sensitive administration. Enterprise SSO can follow demand.

Service identities are separate from users, narrowly scoped, rotated, and never impersonate a human. Production support access is time-bound, approved, and audited.

## Authorization model

Use RBAC for coarse capabilities plus contextual policy checks (ABAC) for organization, resource state, ownership, approval threshold, and separation of duties.

Suggested roles are templates, not hard-coded trust:

| Role | Representative permissions |
| --- | --- |
| Org admin | Manage organization settings, memberships, role assignments; no implicit finance/operations approval. |
| Operations | Read/write customers, facilities, intake, loads, stops, tracking, documents, drafts, and exceptions. |
| Sales/pricing | Manage intake/quotes and pricing inputs; request quote approval. |
| Operations approver | Approve carrier selection, rate confirmation, operational exceptions within policy. |
| Finance | Prepare charges, invoices, bills, and reconciliation. |
| Finance approver | Approve invoice issuance, bills, payment preparation, and accessorials within thresholds. |
| Compliance | Manage checks and review warnings; override requires explicit permission and approval. |
| Auditor | Read scoped records/audit evidence; no mutations or secret/document bulk export by default. |

Define atomic permissions such as `load.read`, `load.update`, `quote.request_approval`, `quote.approve`, `quote.send`, `booking.approve`, `rate_confirmation.send`, `accessorial.approve`, `invoice.approve`, `invoice.issue`, `carrier_bill.approve`, `payment.prepare`, `compliance.override`, `audit.read`, and `membership.manage`.

For each request, policy evaluation verifies: authenticated principal; active membership; matching organization; permission; resource relationship; valid state transition; value/threshold scope; separation-of-duties rule; recent authentication if sensitive; and required approval. Never accept organization, role, price, or approval claims from the browser without reloading authoritative data.

## Mandatory human approval controls

Human approval is required before sending quotes, selecting/bookings carriers, issuing rate confirmations, approving accessorials, issuing customer invoices, approving carrier bills/payment information, executing any future payment, resolving claims, or overriding compliance warnings. A draft creator/requester cannot self-approve high-risk actions by default. Approval binds the exact immutable revision/hash; any material edit invalidates it. Approved does not mean executed: execution is a separate authorized, idempotent command.

## Tenant isolation

- Resolve organization from trusted route/session context and require active membership; do not trust a body-provided tenant ID.
- All tenant repositories require `organizationId`; compound foreign keys prevent cross-tenant links.
- Use request-scoped database context and evaluate PostgreSQL RLS as defense in depth. Background jobs carry tenant scope and use the same repository rules.
- Cache keys, object keys, search indexes, logs, analytics, exports, and AI requests must preserve tenant separation.
- Automated negative tests create two tenants and attempt read/write/link/list/export access across every resource type.

## Data and application controls

- TLS in transit; managed encryption at rest; secrets in a secret manager; key rotation and environment separation.
- Private object buckets; randomized keys; server-authorized short-lived signed URLs; checksum, size/type limits, malware scan, quarantine, and safe download headers.
- Zod validation and allowlists at every boundary; parameterized database access; output encoding; CSP and standard security headers.
- Redact credentials, tokens, document/message bodies, and unnecessary PII from logs and error reports.
- Rate-limit authentication, invitations, upload, AI, export, and send endpoints. Protect bulk exports with explicit permission and audit.
- Dependencies are pinned/reviewed/scanned; CI uses least-privilege ephemeral credentials and produces a software bill of materials when releases begin.

## Audit and incident readiness

Audit authentication/admin changes, role changes, access to sensitive exports/documents, approvals, sends, state transitions, pricing/charge changes, compliance actions, AI dispositions, invoices/bills, and payment records. Protect audit storage from application mutation; ship a copy to restricted durable storage when operations begin. Define incident severity, containment, evidence preservation, customer notification, credential rotation, and recovery exercises before production.
