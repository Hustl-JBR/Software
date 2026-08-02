import { NetworkWorkspace } from "@/app/ui/platform-workspace";
import { StagingNetworkWorkspace } from "@/app/ui/staging-platform-workspaces";
import { prisma } from "@atlas/db/client";
import { isDemoMode } from "@/lib/demo-store";
import { requireStagingWorkspace } from "@/lib/staging-workspace";
import { relativeTime } from "@/lib/atlas-view-models";
import { providerCapabilities } from "@/lib/providers";

export default async function NetworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) return <NetworkWorkspace />;
  const { membership } = await requireStagingWorkspace(slug);
  const capabilities = providerCapabilities();
  const loads = await prisma.load.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      customer: true,
      stops: true,
      carrierCandidates: true,
      driverAssignment: { include: { carrierCandidate: true } },
    },
  });
  const storedFacilities = await prisma.facility.findMany({
    where: { organizationId: membership.organizationId },
    include: { _count: { select: { stops: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  const carriers = new Map<string, ReturnType<typeof carrierView>>();
  const drivers = new Map<
    string,
    { name: string; carrier: string; load: string; dispatcher: string }
  >();
  const customers = new Map<string, { name: string; loads: number }>();
  for (const load of loads) {
    const customer = customers.get(load.customer.name) ?? {
      name: load.customer.name,
      loads: 0,
    };
    customer.loads += 1;
    customers.set(customer.name, customer);
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
      slug={slug}
      locationSearchAvailable={capabilities.location.available}
      carriers={[...carriers.values()]}
      drivers={[...drivers.values()]}
      customers={[...customers.values()]}
      facilities={storedFacilities.map((facility) => ({
        id: facility.id,
        name: facility.name,
        location: `${facility.city}, ${facility.state} ${facility.postalCode}`,
        visits: facility._count.stops,
        status: facility.status,
        timeZone: facility.timeZone,
        validationStatus: facility.validationStatus,
        manuallyEntered: facility.manuallyEntered,
        addressLine1: facility.addressLine1,
        addressLine2: facility.addressLine2,
        city: facility.city,
        state: facility.state,
        postalCode: facility.postalCode,
        latitude: facility.latitude?.toNumber() ?? null,
        longitude: facility.longitude?.toNumber() ?? null,
        phone: facility.phone,
        appointmentRequired: facility.appointmentRequired,
      }))}
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
