import { notFound, redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
export default async function LoadDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
  });
  if (!membership) notFound();
  const load = await prisma.load.findUnique({
    where: {
      organizationId_id: { organizationId: membership.organizationId, id },
    },
    include: {
      customer: true,
      stops: { orderBy: { sequence: "asc" } },
      statusHistory: true,
      approvedRevision: true,
    },
  });
  if (!load) notFound();
  const audits = await prisma.auditEvent.findMany({
    where: {
      organizationId: membership.organizationId,
      OR: [
        { entityType: "Load", entityId: id },
        {
          correlationId: {
            in: (
              await prisma.auditEvent.findMany({
                where: {
                  organizationId: membership.organizationId,
                  entityType: "Load",
                  entityId: id,
                },
                select: { correlationId: true },
              })
            ).map((x) => x.correlationId),
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <a className="back" href={`/org/${slug}`}>
        ← Dashboard
      </a>
      <div className="toolbar">
        <div>
          <p className="eyebrow">Draft load created</p>
          <h1>{load.loadNumber}</h1>
          <p className="muted">
            {load.customer.name} · {load.commodity} ·{" "}
            {load.weightPounds.toLocaleString()} lb
          </p>
        </div>
        <span className="badge draft">{load.status}</span>
      </div>
      <div className="route">
        {load.stops.map((stop, index) => (
          <article className="card" key={stop.id}>
            <p className="eyebrow">
              Stop {stop.sequence} · {stop.type}
            </p>
            <h2>{stop.facilityName}</h2>
            <p>
              {stop.city}, {stop.state} {stop.postalCode}
            </p>
            {index === 0 && <span className="route-line" />}
          </article>
        ))}
      </div>
      <section className="card">
        <h2>Approved shipment</h2>
        <dl>
          <div>
            <dt>Pickup</dt>
            <dd>{load.pickupDate.toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{load.deliveryDate.toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt>Equipment</dt>
            <dd>Dry van</dd>
          </div>
          <div>
            <dt>Approved revision</dt>
            <dd>#{load.approvedRevision.revisionNumber}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Immutable audit timeline</h2>
        <div className="timeline">
          {audits.map((event) => (
            <div key={event.id}>
              <i />
              <p>
                <strong>{event.action.replaceAll("_", " ")}</strong>
                <small>
                  {event.createdAt.toLocaleString()} · {event.entityType} ·
                  correlation {event.correlationId.slice(0, 8)}
                </small>
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
