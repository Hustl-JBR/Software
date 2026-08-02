# Supabase decision

## Decision

Railway PostgreSQL remains Atlas's single authoritative datastore and Better Auth remains its authentication system. This milestone creates no Supabase project, table, user, copy of Atlas data, or Auth connection.

Adding a second application database would duplicate users and organizations, split authorization and migrations, and create competing sources of truth. Adding Supabase Auth beside Better Auth would likewise create two session, identity, revocation, and incident-response paths.

Supabase could be evaluated later for a bounded capability such as object storage, analytics export, or an isolated non-authoritative prototype. Document storage is not approved yet: retention, encryption, region, malware scanning, access logging, signed-URL lifetime, deletion, backup, and cost requirements must be selected before a provider.

Atlas should define a `DocumentStorageProvider` with upload, metadata, scoped retrieval, signed access, deletion/retention, and health operations. Domain records remain in Railway PostgreSQL; the provider stores only opaque objects and returns provider-neutral identifiers.

An intentional database move would require schema translation, staged dual-read validation (not indefinite dual-write), identity/session migration, row-count and checksum reconciliation, cutover/rollback criteria, audited downtime planning, and retirement of the old source. It is a migration project, not a casual connection.
