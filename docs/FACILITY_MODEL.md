# Facility model

Facilities are reusable, organization-scoped operational records. They are not global address-book entries and may never be read or linked across an organization boundary.

`Facility` stores the current reusable name, address, coordinates, IANA time zone, provider identity, validation provenance, operating notes, appointment policy, contacts, active/inactive state, and creator/updater. A provider-selected record is `VALIDATED` or `NEEDS_REVIEW`; a human-entered record is `MANUALLY_CONFIRMED`. Archiving sets the facility inactive and preserves history.

`LoadStop` stores an immutable operational snapshot plus an optional facility reference. Linking or relinking copies the facility name, full address, coordinates, time zone, provider provenance, and validation state into the stop. Later edits to the directory record do not rewrite an existing shipment. Composite `(organization_id, facility_id)` and `(organization_id, load_id)` foreign keys prevent cross-tenant references.

Manual entry remains a first-class path when no provider is configured or a search fails. A manual facility requires a complete US postal address and an explicit IANA time zone. No provider verification is claimed.

Provider keys, raw provider payloads, full search strings, and billing metadata are not stored on the facility. Usage logs contain only tenant, actor, provider, operation, outcome, duration, cache status, units, and timestamp.
