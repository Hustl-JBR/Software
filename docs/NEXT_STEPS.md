# Next steps

1. Review and merge the stacked facilities/routing PR only after its clean PostgreSQL migration and responsive staging evidence pass; do not merge PR #2 automatically.
2. Keep the employee workflow mapping-provider-free unless a later owner-approved product phase replaces the manual-address and OpenStreetMap-link decision.
3. Do not begin commercial routing/provider procurement, load boards, GPS/ELD, customer portal, EDI, accounting, payment, or other excluded integrations in this phase.

4. Complete this recovery's CI, Railway staging deployment, browser matrix, and persistence verification without creating infrastructure.
5. Next implementation phase: add a reviewed administrator invitation/provisioning UI with verified email and secure password-reset or passkey enrollment.
6. Configure and restore-test an independent private PostgreSQL backup before permitting real data.
7. Add rate limiting, CSRF-focused verification, MFA/passkeys for privileged users, and restricted audit export before production planning.
8. Keep DAT, other load boards, customer portals, public APIs, EDI, accounting, live tracking, and document storage at the provider-neutral planning boundary.
