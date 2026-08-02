import { notFound, redirect } from "next/navigation";
import { ShipmentForm } from "@/app/ui/shipment-form";
import { ErrorAlert } from "@/app/ui/error-alert";
import { submitShipment } from "@/app/actions";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@atlas/db/client";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";

export default async function NewRequest({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const demo = isDemoMode();
  let facilities: Array<{
    id: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    timeZone: string;
  }> = [];
  if (demo) {
    if (slug !== DEMO_ORGANIZATION.slug) notFound();
  } else {
    const userId = await getSessionUserId();
    if (!userId) redirect("/sign-in");
    const membership = await prisma.organizationMembership.findFirst({
      where: { userId, status: "ACTIVE", organization: { slug } },
    });
    if (!membership) notFound();
    facilities = await prisma.facility.findMany({
      where: { organizationId: membership.organizationId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        timeZone: true,
      },
      orderBy: { name: "asc" },
    });
  }
  return (
    <>
      <div className="breadcrumb">
        <a href={`/org/${slug}`}>Today</a>
        <span>/</span>
        <strong>New shipment</strong>
      </div>
      <div className="page-heading compact-heading">
        <div>
          <p className="overline">
            {demo ? "Guided demo intake" : "Human-reviewed intake"}
          </p>
          <h1>Create a shipment</h1>
          <p className="page-subtitle">
            Describe the move naturally. Atlas deterministically structures it,
            flags gaps, and keeps approval with your team.
          </p>
        </div>
        <span className="secure-note">
          <i>✓</i> No external services
        </span>
      </div>
      <ErrorAlert code={(await searchParams).error} />
      <form action={submitShipment} className="intake-layout">
        <input type="hidden" name="organizationSlug" value={slug} />
        <div className="intake-main">
          <section className="ai-composer panel">
            <div className="composer-heading">
              <span className="ai-orb large">✦</span>
              <div>
                <h2>Tell Atlas about the shipment</h2>
                <p>
                  Paste an email, type a request, or use your own shorthand.
                </p>
              </div>
            </div>
            <label className="composer-field">
              <span className="sr-only">Plain-English shipment request</span>
              <textarea
                name="originalText"
                rows={8}
                autoFocus
                placeholder="Move 18 pallets of packaged furniture from Nashville, Tennessee to Atlanta, Georgia. Pickup is August 5, 2026…"
              />
            </label>
            <div className="composer-footer">
              <span>
                <kbd>⌘</kbd>
                <kbd>↵</kbd> to analyze
              </span>
              <span>Atlas never guesses required data</span>
            </div>
          </section>
          <details className="known-details panel">
            <summary>
              <span>
                <i>＋</i>
                <b>Add known shipment details</b>
              </span>
              <small>Optional · Atlas will extract what it can</small>
            </summary>
            <ShipmentForm compact facilities={facilities} />
          </details>
          <div className="sticky-action-bar">
            <a className="button button-ghost" href={`/org/${slug}`}>
              Cancel
            </a>
            <button
              className="button button-primary analyze-button"
              type="submit"
            >
              <span>✦</span> Analyze shipment <b>→</b>
            </button>
          </div>
        </div>
        <aside className="intake-aside">
          <section className="panel help-card">
            <p className="overline violet">How it works</p>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <b>Describe the freight</b>
                  <small>Use the language you already use.</small>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <b>Atlas structures it</b>
                  <small>Deterministic extraction, no guessing.</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <b>You stay in control</b>
                  <small>Review every field before approval.</small>
                </div>
              </li>
            </ol>
          </section>
          <section className="panel example-card">
            <span className="eyebrow-icon">↗</span>
            <p className="overline">Example</p>
            <p>
              “Pick up 22 pallets of paper goods in Knoxville on Friday and
              deliver to Charlotte Monday. 31,500 pounds, dry van.”
            </p>
            <span className="inline-action">Use this structure as a guide</span>
          </section>
          <div className="privacy-note">
            <span>◈</span>
            <p>
              <b>Private by design</b>
              <small>
                {demo
                  ? "Demo data stays in this local session and resets when the server restarts."
                  : "Submitted staging requests persist inside this organization and remain subject to tenant and role checks."}
              </small>
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
