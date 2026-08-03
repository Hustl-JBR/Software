# Product vision

Ready Operations is the small internal operating system for Ready Freight. It serves two owners and follows the brokerage lifecycle from a customer quote request through carrier booking, dispatch, manual updates, delivery paperwork, customer invoicing, carrier-bill review, payments, and completion. It prioritizes explicit work such as “Assign a carrier” and “Upload the POD” over enterprise dashboards, AI narratives, or governance language.

The active product has five primary areas: Today, Quotes, Loads, Companies, and Money. It works without paid providers: addresses are entered manually, mileage is optional, OpenStreetMap is an external link, DAT posting is recorded manually, and tracking updates are manual. Load-board automation, mapping/routing APIs, live tracking, automated compliance, customer portals, accounting sync, payments, and AI automation are outside the current scope.

The Ready Operations direction above supersedes the historical Atlas vision retained below for implementation context.

Atlas is a freight-operations system that continuously answers what is happening, what needs attention, why it matters, who owns the next action, what evidence supports it, and what a human must approve. It should combine the information density of a logistics command center with the clarity of modern enterprise software.

Initial scope is domestic US FTL dry-van operations. Atlas assists operators with shipment intake, execution, exceptions, communication drafts, carrier evaluation, pricing, and financial reconciliation. Atlas proposes and explains; people approve consequential actions. Sensitive driver and customer data is disclosed only to authorized roles and every disclosure is auditable.

Atlas normally sources and approves a motor carrier or owner-operator business, not an individual driver. After customer acceptance, Atlas supports carrier sourcing, identity/authority/insurance/suitability review, rate negotiation, and human carrier selection. The selected carrier then assigns a driver and provides dispatcher, tractor, trailer, and tracking details. A driver may also be the owner-operator, but carrier selection and driver assignment remain separate records and approval boundaries. Atlas is not a driver-recruiting marketplace.

The first persistent product is an authenticated internal workspace for four employees. There is no customer portal in this phase. It must remain useful without external integrations by supporting manual intake, quoting, carrier sourcing, compliance evidence, driver assignment, appointments, tracking updates, communication logging, tasks, documents, and audit history in PostgreSQL.
