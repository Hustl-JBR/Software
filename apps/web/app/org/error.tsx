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
          Your saved work is unchanged. Retry this screen or return to the
          workspace selector.
        </p>
        <button className="button button-primary" onClick={reset}>
          Retry
        </button>
        <Link className="button button-secondary" href="/">
          Workspace selector
        </Link>
      </div>
    </section>
  );
}
