import Link from "next/link";

export default function NotFound() {
  return (
    <section className="auth card">
      <p className="eyebrow">Not found</p>
      <h1>That record is unavailable.</h1>
      <p className="muted">
        It may not exist, or it may belong to another organization.
      </p>
      <Link className="button" href="/org/atlas-north">
        Return to Today
      </Link>
    </section>
  );
}
