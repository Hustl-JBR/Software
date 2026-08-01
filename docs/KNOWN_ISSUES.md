# Known issues

- Active demo operations are browser-session state and are not durable or multi-user.
- Synthetic contacts and compliance evidence are design fixtures, not verified official records.
- Some demo buttons intentionally log or draft locally; they never send messages, call people, upload documents, select production carriers, or transfer money.
- The environment runs Node 24 although the repository targets Node 22 LTS; commands emit an engine warning.
- Real PostgreSQL integration tests and migrations have not been rerun in the current Windows environment.
- Driver profiles, facility appointment mutations, task-drawer workflows, and Settings/Document persistence still use static or component-local demo state and are the next typed shared-state task.
- Staging uses synthetic password accounts without email verification delivery, password reset email, MFA/passkeys, login rate limiting, or an administrator invitation UI. Public sign-up is disabled and real employees must not be added until the reviewed provisioning flow exists.
- The legacy single `OrganizationMembership.role` remains alongside additive membership-role rows for backward compatibility. Authorization uses their union; a later migration should remove the legacy field after all callers are converted.
- Railway plan/allowance details are not exposed by the connected tool. Usage is billable and must be monitored in the Railway dashboard.
- No independent scheduled PostgreSQL backup or restore drill is configured. Staging must contain synthetic data only.
- Staging carrier authority, insurance, coverage, tracking, and communications are manual assertions, not official or live provider data.
