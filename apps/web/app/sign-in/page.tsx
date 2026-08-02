import { redirect } from "next/navigation";
import { signIn } from "../actions";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";
import { EnvironmentChip } from "@/app/ui/atlas-primitives";
import { SignInButton } from "@/app/ui/sign-in-button";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode()) redirect(`/org/${DEMO_ORGANIZATION.slug}`);
  const error = (await searchParams).error;
  return (
    <section className="auth-stage">
      <aside className="auth-visual">
        <span className="brand-mark">A</span>
        <div>
          <p className="overline">Atlas operations</p>
          <h1>Keep every load moving with a clear operational picture.</h1>
          <p>
            Persistent requests, approvals, dispatch controls, communications,
            and audit history—inside the same command center operators already
            know.
          </p>
        </div>
        <dl>
          <div>
            <dt>Environment</dt>
            <dd>Staging environment</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Provisioned employees only</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>Database-backed and expiring</dd>
          </div>
        </dl>
      </aside>
      <div className="auth-panel">
        <div className="auth-panel-heading">
          <EnvironmentChip mode="staging" />
          <p className="eyebrow">Internal access</p>
          <h2>Welcome back</h2>
          <p className="muted">
            Sign in with your provisioned Atlas staging account.
          </p>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error === "database"
              ? "Atlas cannot reach the staging database. Try again shortly or contact the staging administrator."
              : "The email or password is invalid, or this account is inactive."}
          </div>
        )}
        <form action={signIn} className="auth-form">
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@atlas.example"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              placeholder="Enter your password"
              required
            />
          </label>
          <SignInButton />
        </form>
        <div className="auth-help">
          <b>Need access or a password reset?</b>
          <p>
            Account creation and recovery are administrator-controlled in this
            milestone. Contact the staging administrator; Atlas never displays
            seeded credentials.
          </p>
        </div>
      </div>
    </section>
  );
}
