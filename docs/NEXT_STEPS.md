# Next steps

1. Add browser-level staging coverage for logout/session expiry and deactivation; two-user sign-in, shared data, tenant denial, and redeploy persistence are already enforced in the Railway pre-deploy gate.
2. Add a reviewed administrator invitation/provisioning UI before onboarding real employees; require verified email and a password-reset or passkey enrollment flow.
3. Configure and restore-test an independent private PostgreSQL backup before permitting any real data.
4. Add rate limiting, CSRF-focused verification, MFA/passkeys for privileged users, and restricted audit export before production planning.
5. Rename the generated `divine-purpose` service to `Atlas web` in the Railway dashboard when convenient; the connected API cannot rename services and the immutable service ID is documented.
6. Do not begin production infrastructure, customer portal work, or third-party freight integrations in this milestone.
