import { notFound, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { approve, saveCorrection } from "@/app/actions";
import { ShipmentForm } from "@/app/ui/shipment-form";

export default async function Review({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug, id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
  });
  if (!membership) notFound();
  const request = await prisma.shipmentRequest.findUnique({
    where: {
      organizationId_id: { organizationId: membership.organizationId, id },
    },
    include: {
      revisions: {
        orderBy: { revisionNumber: "desc" },
        include: { issues: true },
      },
      load: true,
    },
  });
  if (!request) notFound();
  if (request.load) redirect(`/org/${slug}/loads/${request.load.id}`);
  const revision = request.revisions[0];
  const values = revision.structuredData as Record<string, unknown>;
  return (
    <>
      <a className="back" href={`/org/${slug}`}>
        ← Dashboard
      </a>
      <div className="toolbar">
        <div>
          <p className="eyebrow">
            Human review · Revision {revision.revisionNumber}
          </p>
          <h1>Review shipment request</h1>
          <p className="muted">
            Corrections create a new immutable revision. Approval binds only the
            latest exact revision.
          </p>
        </div>
        <span className="badge needs_review">Needs review</span>
      </div>
      {(await searchParams).saved && (
        <div className="alert success">
          A new immutable correction revision was saved.
        </div>
      )}
      <section className="source card">
        <h2>Original request</h2>
        <p>
          {revision.originalText || "No plain-English request was supplied."}
        </p>
      </section>
      <section>
        <h2>Validation issues</h2>
        {revision.issues.length ? (
          <div className="issues">
            {revision.issues.map((issue) => (
              <article
                className={`issue ${issue.type.toLowerCase()}`}
                key={issue.id}
              >
                <span>{issue.type}</span>
                <div>
                  <strong>{issue.field || "Request"}</strong>
                  <p>{issue.message}</p>
                  {issue.sourceReference && (
                    <small>{issue.sourceReference}</small>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="alert success">
            This revision passes deterministic validation. Review every value
            before approving.
          </div>
        )}
      </section>
      <form action={saveCorrection} className="card">
        <input type="hidden" name="organizationSlug" value={slug} />
        <input type="hidden" name="requestId" value={id} />
        <ShipmentForm values={values} />
        <button className="secondary" type="submit">
          Save as new revision
        </button>
      </form>
      <section className="approval card">
        <p className="eyebrow">Consequential action</p>
        <h2>Approve exact revision {revision.revisionNumber}</h2>
        <p>
          Atlas will validate again and atomically create one draft load, one
          pickup, one delivery, status history, and audit events.
        </p>
        {membership.role === "APPROVER" ? (
          <form action={approve}>
            <input type="hidden" name="organizationSlug" value={slug} />
            <input type="hidden" name="revisionId" value={revision.id} />
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <label className="check">
              <input required type="checkbox" /> I reviewed and approve this
              exact revision.
            </label>
            <button type="submit">Approve and create draft load</button>
          </form>
        ) : (
          <div className="alert warning">
            Your {membership.role.toLowerCase()} role can correct this request
            but cannot approve it.
          </div>
        )}
      </section>
      <section>
        <h2>Revision history</h2>
        <div className="timeline">
          {request.revisions.map((item) => (
            <div key={item.id}>
              <i />
              <p>
                <strong>Revision {item.revisionNumber}</strong>
                <small>
                  {item.createdAt.toLocaleString()} · {item.issues.length}{" "}
                  issue(s)
                </small>
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
