import { TrackingWorkspace } from "@/app/ui/platform-workspace";
import { StagingTrackingWorkspace } from "@/app/ui/staging-platform-workspaces";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { relativeTime } from "@/lib/atlas-view-models";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) return <TrackingWorkspace />;
  const { membership } = await requireStagingWorkspace(slug);
  const loads = await prisma.load.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      carrierCandidates: { where: { status: "SELECTED" }, take: 1 },
      driverAssignment: true,
      trackingUpdates: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <StagingTrackingWorkspace
      slug={slug}
      loads={loads.map((load) => {
        const latest = load.trackingUpdates[0];
        return {
          id: load.id,
          number: load.loadNumber,
          route:
            load.stops.length > 1
              ? `${load.stops[0].city}, ${load.stops[0].state} → ${load.stops.at(-1)!.city}, ${load.stops.at(-1)!.state}`
              : "Route not available",
          driver: load.driverAssignment?.driverName ?? "Unassigned",
          dispatcher: load.driverAssignment?.dispatcherName ?? "Unassigned",
          carrier: load.carrierCandidates[0]?.carrierName ?? "Unassigned",
          status: latest?.status ?? load.status,
          location: latest?.location ?? "No location reported",
          updatedAt: relativeTime(latest?.occurredAt),
          notes: latest?.notes ?? undefined,
          nextAction: load.nextAction ?? "No next action assigned",
          href: `/org/${slug}/loads/${load.id}`,
        };
      })}
    />
  );
}
