"use client";
import Link from "next/link";
export default function OrganizationError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="panel controlled-error">
      <span>!</span>
      <div>
        <p className="overline">Workspace unavailable</p>
        <h1>Atlas could not load this screen</h1>
        <p>
          The demo session is still safe. Retry this screen or return to the
          command center.
        </p>
        <button className="button button-primary" onClick={reset}>
          Retry
        </button>
        <Link className="button button-secondary" href="/org/atlas-north">
          Command center
        </Link>
      </div>
    </section>
  );
}
