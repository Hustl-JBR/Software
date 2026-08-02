import { NetworkWorkspace } from "@/app/ui/platform-workspace";
import { StagingNetworkWorkspace } from "@/app/ui/staging-platform-workspaces";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { relativeTime } from "@/lib/atlas-view-models";

export default async function NetworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) return <NetworkWorkspace />;
  const { membership } = await requireStagingWorkspace(slug);
  const loads = await prisma.load.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      customer: true,
      stops: true,
      carrierCandidates: true,
      driverAssignment: { include: { carrierCandidate: true } },
    },
  });
  const carriers = new Map<string, ReturnType<typeof carrierView>>();
  const drivers = new Map<
    string,
    { name: string; carrier: string; load: string; dispatcher: string }
  >();
  const customers = new Map<string, { name: string; loads: number }>();
  const facilities = new Map<
    string,
    { name: string; location: string; visits: number }
  >();
  for (const load of loads) {
    const customer = customers.get(load.customer.name) ?? {
      name: load.customer.name,
      loads: 0,
    };
    customer.loads += 1;
    customers.set(customer.name, customer);
    for (const stop of load.stops) {
      const key = `${stop.facilityName}-${stop.city}-${stop.state}`;
      const facility = facilities.get(key) ?? {
        name: stop.facilityName,
        location: `${stop.city}, ${stop.state}`,
        visits: 0,
      };
      facility.visits += 1;
      facilities.set(key, facility);
    }
    for (const candidate of load.carrierCandidates)
      carriers.set(candidate.carrierName, carrierView(candidate, slug));
    if (load.driverAssignment)
      drivers.set(load.driverAssignment.driverName, {
        name: load.driverAssignment.driverName,
        carrier: load.driverAssignment.carrierCandidate.carrierName,
        load: load.loadNumber,
        dispatcher: load.driverAssignment.dispatcherName,
      });
  }
  return (
    <StagingNetworkWorkspace
      carriers={[...carriers.values()]}
      drivers={[...drivers.values()]}
      customers={[...customers.values()]}
      facilities={[...facilities.values()]}
    />
  );
}

function carrierView(
  candidate: {
    id: string;
    carrierName: string;
    status: string;
    authorityConfirmed: boolean;
    insuranceConfirmed: boolean;
    blockReason: string | null;
    updatedAt: Date;
  },
  slug: string,
) {
  const blocked = candidate.status === "BLOCKED";
  return {
    id: candidate.id,
    name: candidate.carrierName,
    reviewResult: blocked ? "Blocked" : candidate.status,
    authority: candidate.authorityConfirmed ? "Confirmed" : "Unconfirmed",
    insurance: candidate.insuranceConfirmed ? "Confirmed" : "Unconfirmed",
    warning:
      candidate.blockReason ??
      (candidate.authorityConfirmed && candidate.insuranceConfirmed
        ? "No recorded warning"
        : "Verification incomplete"),
    relationship: candidate.status === "SELECTED" ? "Selected" : "Candidate",
    lastVerified: relativeTime(candidate.updatedAt),
    doNotUse: blocked,
    href: `/org/${slug}/network/carriers/${candidate.id}`,
  };
}
