import { AnalyticsWorkspace } from "@/app/ui/platform-workspace";
import { StagingAnalyticsWorkspace } from "@/app/ui/staging-platform-workspaces";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (isDemoMode()) return <AnalyticsWorkspace />;
  const { slug } = await params;
  const { membership } = await requireStagingWorkspace(slug);
  const organizationId = membership.organizationId;
  const [requests, loads, openTasks, trackingUpdates] = await Promise.all([
    prisma.shipmentRequest.count({ where: { organizationId } }),
    prisma.load.count({ where: { organizationId } }),
    prisma.task.count({ where: { organizationId, status: "OPEN" } }),
    prisma.trackingUpdate.count({ where: { organizationId } }),
  ]);
  return (
    <StagingAnalyticsWorkspace
      requests={requests}
      loads={loads}
      openTasks={openTasks}
      trackingUpdates={trackingUpdates}
    />
  );
}
