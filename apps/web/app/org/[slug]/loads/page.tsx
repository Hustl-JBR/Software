import Link from "next/link";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";

export default async function LoadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode())
    return (
      <div className="ready-page">
        <h1>Loads</h1>
        <p>Persistent loads are available in staging.</p>
      </div>
    );
  const { membership } = await requireStagingWorkspace(slug);
  const loads = await prisma.load.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      customer: true,
      stops: { orderBy: { sequence: "asc" } },
      carrier: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="ready-page">
      <header className="ready-heading">
        <div>
          <p className="overline">Operations</p>
          <h1>Loads</h1>
          <p>From uncovered through completed.</p>
        </div>
      </header>
      <div className="panel ready-table">
        {loads.length ? (
          loads.map((load) => (
            <Link
              className="ready-row"
              href={`/org/${slug}/loads/${load.id}`}
              key={load.id}
            >
              <span>
                <strong>{load.loadNumber}</strong> · {load.customer.name}
                <small>
                  {load.stops.map((s) => `${s.city}, ${s.state}`).join(" → ")}
                </small>
              </span>
              <span>
                {load.status === "DRAFT"
                  ? "Uncovered"
                  : load.status.replaceAll("_", " ")}
                <small>
                  {load.carrier?.legalName || "Carrier not assigned"}
                </small>
              </span>
            </Link>
          ))
        ) : (
          <p className="ready-empty">
            Accepted quotes will appear here as uncovered loads.
          </p>
        )}
      </div>
    </div>
  );
}
