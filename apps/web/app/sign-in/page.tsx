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
        Development authentication uses seeded synthetic identities. Production
        authentication is not configured.
      </p>
      {error && (
        <div className="alert error" role="alert">
          {error === "database"
            ? "Atlas cannot reach the development database. Confirm PostgreSQL and the environment configuration."
            : "That development user is unavailable."}
        </div>
      )}
      <form action={signIn}>
        <label>
          Email
          <select name="email" defaultValue="approver@atlas.local">
            <option>approver@atlas.local</option>
            <option>operator@atlas.local</option>
            <option>viewer@atlas.local</option>
            <option>south@atlas.local</option>
          </select>
        </label>
        <button type="submit">Continue securely</button>
      </form>
      <p className="caption">
        No password is used in this local-only authentication seam.
      </p>
    </section>
  );
}
