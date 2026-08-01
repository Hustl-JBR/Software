# Product vision

Atlas is a freight-operations system that continuously answers what is happening, what needs attention, why it matters, who owns the next action, what evidence supports it, and what a human must approve. It should combine the information density of a logistics command center with the clarity of modern enterprise software.

Initial scope is domestic US FTL dry-van operations. Atlas assists operators with shipment intake, execution, exceptions, communication drafts, carrier evaluation, pricing, and financial reconciliation. Atlas proposes and explains; people approve consequential actions. Sensitive driver and customer data is disclosed only to authorized roles and every disclosure is auditable.

Atlas normally sources and approves a motor carrier or owner-operator business, not an individual driver. After customer acceptance, Atlas supports carrier sourcing, identity/authority/insurance/suitability review, rate negotiation, and human carrier selection. The selected carrier then assigns a driver and provides dispatcher, tractor, trailer, and tracking details. A driver may also be the owner-operator, but carrier selection and driver assignment remain separate records and approval boundaries. Atlas is not a driver-recruiting marketplace.

The first persistent product is an authenticated internal workspace for four employees. There is no customer portal in this phase. It must remain useful without external integrations by supporting manual intake, quoting, carrier sourcing, compliance evidence, driver assignment, appointments, tracking updates, communication logging, tasks, documents, and audit history in PostgreSQL.
