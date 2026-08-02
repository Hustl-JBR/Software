# Operations workspace

`/operations` is the normal authenticated employee entry point in persistent staging. It shows freight requiring attention, intake awaiting review, open tasks, ownership/readiness blockers, and one New Shipment action. It uses tenant-scoped persisted records and never exposes synthetic developer controls.

The organization command center remains the broader daily view: my work, customer follow-ups, upcoming pickups/deliveries, open tasks, blockers, and meaningful activity. Load-specific work belongs on `/org/[slug]/loads/[id]`:

- Overview: status, customer, lane, ownership, next action, blockers.
- Pricing: quote, approval, customer decision.
- Sourcing: carrier options, evidence, rates, qualification, selection.
- Carrier: selected business and driver/dispatcher/equipment assignment.
- Stops and Tracking: appointments and permissible updates.
- Communications and Tasks: persisted follow-up.
- Timeline: employee language; Audit: administrator-level technical history.

Authorization remains server-side. Hidden controls are not a security boundary. Demo mode stays synthetic and redirects `/operations` to its existing demo load workspace.
