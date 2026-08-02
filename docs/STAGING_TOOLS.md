# Internal staging tools

`/internal/staging-tools` preserves synthetic command-entry controls needed for testing. It is intentionally absent from employee navigation and is not an employee product screen.

Access requires an active tenant membership with the complete staging administrator capability bundle: APPROVER, OPERATOR, and VIEWER explicit roles. The seeded Devon account is the intended synthetic administrator. The current schema has no ADMIN enum; this narrow bundle is documented technical debt, not a general definition of administration.

Every command reuses existing server actions, validates tenant scope and permissions, accepts a safe return path, converts dollars to integer cents, audits consequential changes, and maps exceptions to safe error codes. Raw Prisma, SQL, constraint, or exception text must never enter UI text or query parameters.

Do not use these tools with real freight. Do not link them from normal navigation. Promote a control into the employee product only by placing it on the relevant record with domain-appropriate authorization and tests.
