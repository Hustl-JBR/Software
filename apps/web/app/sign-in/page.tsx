import { signIn } from "../actions";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";
import { redirect } from "next/navigation";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  const error = (await searchParams).error;
  return (
    <section className="auth card">
      <p className="eyebrow">Internal access</p>
      <h1>Sign in to Atlas</h1>
      <p className="muted">
        Staging uses individual synthetic employee accounts with expiring,
        database-backed sessions.
      </p>
      {error && (
        <div className="alert error" role="alert">
          {error === "database"
            ? "Atlas cannot reach the development database. Confirm PostgreSQL and the environment configuration."
            : "The email or password is invalid, or this account is inactive."}
        </div>
      )}
      <form action={signIn}>
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            required
          />
        </label>
        <button type="submit">Continue securely</button>
      </form>
      <p className="caption">
        Account creation is disabled. A staging administrator provisions or
        deactivates employee accounts through the audited seed/admin process.
      </p>
    </section>
  );
}
