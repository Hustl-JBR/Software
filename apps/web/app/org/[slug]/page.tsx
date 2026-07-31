import { notFound, redirect } from "next/navigation";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import { signOut } from "../../actions";
import { ErrorAlert } from "@/app/ui/error-alert";
export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
    include: { organization: true, user: true },
  });
  if (!membership) notFound();
  const requests = await prisma.shipmentRequest.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      load: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <>
      <div className="toolbar">
        <div>
          <p className="eyebrow">{membership.organization.name}</p>
          <h1>Operations dashboard</h1>
          <p className="muted">
            Signed in as {membership.user.name} · {membership.role}
          </p>
        </div>
        <form action={signOut}>
          <button className="secondary">Sign out</button>
        </form>
      </div>
      <ErrorAlert code={(await searchParams).error} />
      <div className="actions">
        <a className="button" href={`/org/${slug}/requests/new`}>
          New shipment request
        </a>
      </div>
      <section className="card">
        <h2>Shipment requests</h2>
        {requests.length === 0 ? (
          <p className="empty">
            No shipment requests yet. Start with a plain-English request or
            structured fields.
          </p>
        ) : (
          <div className="list">
            {requests.map((request) => (
              <a
                href={
                  request.load
                    ? `/org/${slug}/loads/${request.load.id}`
                    : `/org/${slug}/requests/${request.id}`
                }
                key={request.id}
              >
                <span>
                  <strong>Request {request.id.slice(0, 8)}</strong>
                  <small>Revision {request.currentRevisionNumber}</small>
                </span>
                <span className={`badge ${request.status.toLowerCase()}`}>
                  {request.status.replace("_", " ")}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
