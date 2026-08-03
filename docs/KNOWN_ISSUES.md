# Known issues

- Uploaded documents are capped at 5 MB and stored in PostgreSQL; production use needs reviewed object storage, retention, access logging, and malware scanning.
- Mileage, DAT posting, carrier review, tracking, invoices, bills, and payment states are manual records, not provider-verified events.

- Mileage is optional and manually reviewed; Atlas does not provide truck-legal routing or an in-product map.

- Active demo operations are browser-session state and are not durable or multi-user.
- Synthetic contacts and compliance evidence are design fixtures, not verified official records.
- Some demo buttons intentionally log or draft locally; they never send messages, call people, upload documents, select production carriers, or transfer money.
- The environment runs Node 24 although the repository targets Node 22 LTS; commands emit an engine warning.
- The local Windows host has neither PostgreSQL nor Docker, so clean-database migration and integration execution must run in the existing GitHub Actions/Railway PostgreSQL gates. This recovery must not claim those results until the new branch passes them.
- Driver profiles, facility appointment mutations, task-drawer workflows, and Settings/Document persistence still use static or component-local demo state and are the next typed shared-state task.
- Staging uses synthetic password accounts without email verification delivery, password reset email, MFA/passkeys, login rate limiting, or an administrator invitation UI. Public sign-up is disabled and real employees must not be added until the reviewed provisioning flow exists.
- The legacy single `OrganizationMembership.role` remains for backward compatibility. Explicit rows are now authoritative and the column is synchronized; a later reviewed migration can remove it after all external callers are converted.
- Staging administrator access currently means the synthetic account possessing APPROVER, OPERATOR, and VIEWER together because the schema has no ADMIN enum. This is intentionally narrow but should become a named administrative permission before real employee provisioning.
- Document storage is inactive. A provider and retention/security model must be selected before implementing the `DocumentStorageProvider` adapter.
- Railway plan/allowance details are not exposed by the connected tool. Usage is billable and must be monitored in the Railway dashboard.
- No independent scheduled PostgreSQL backup or restore drill is configured. Staging must contain synthetic data only.
- Staging carrier authority, insurance, coverage, tracking, and communications are manual assertions, not official or live provider data.
- The web service retains Railway's generated name `divine-purpose`; only the dashboard can rename it with the currently connected tooling. This does not affect its documented service ID or HTTPS domain.
