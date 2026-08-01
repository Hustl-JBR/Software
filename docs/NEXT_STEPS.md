# Next steps

1. Deploy the current branch to the isolated Railway staging project, apply migrations, run PostgreSQL integration tests, and seed four synthetic accounts.
2. Execute authenticated two-user Playwright coverage for shared data, cross-organization denial, logout/session expiry, and deactivation.
3. Verify persistence across a Railway web-service restart and inspect browser/deployment logs.
4. Add a reviewed administrator invitation/provisioning UI before onboarding real employees; require verified email and a password-reset or passkey enrollment flow.
5. Configure and restore-test an independent private PostgreSQL backup before permitting any real data.
6. Add rate limiting, CSRF-focused verification, MFA/passkeys for privileged users, and restricted audit export before production planning.
7. Do not begin production infrastructure, customer portal work, or third-party freight integrations in this milestone.
