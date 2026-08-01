import { notFound, redirect } from "next/navigation";
import { LoadsWorkspace } from "@/app/ui/loads-workspace";
import { LoadsWorkspaceView } from "@/app/ui/loads-workspace-view";
import { DEMO_ORGANIZATION, isDemoMode } from "@/lib/demo-store";
import { prisma } from "@atlas/db/client";
import { getSessionUserId } from "@/lib/session";
import {
  relativeTime,
  shortDate,
  type LoadWorkspaceRow,
} from "@/lib/atlas-view-models";

export default async function LoadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDemoMode()) {
    if (slug !== DEMO_ORGANIZATION.slug) notFound();
    return <LoadsWorkspace slug={slug} />;
  }
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "ACTIVE", organization: { slug } },
  });
  if (!membership) notFound();
  const requests = await prisma.shipmentRequest.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      revisions: {
        orderBy: { revisionNumber: "desc" },
        take: 1,
        include: { issues: true },
      },
      quotes: { orderBy: { createdAt: "desc" } },
      load: {
        include: {
          customer: true,
          primaryOwner: true,
          stops: { orderBy: { sequence: "asc" } },
          carrierCandidates: true,
          driverAssignment: true,
          trackingUpdates: { orderBy: { occurredAt: "desc" }, take: 1 },
          tasks: { where: { status: "OPEN" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows: LoadWorkspaceRow[] = requests.map((request) => {
    const revision = request.revisions[0];
    const candidate = record(revision?.structuredData);
    const load = request.load;
    const selectedCarrier = load?.carrierCandidates.find(
      (item) => item.status === "SELECTED",
    );
    const latestQuote = request.quotes[0];
    const latestTracking = load?.trackingUpdates[0];
    const missing = revision?.issues.length ?? 0;
    const unconfirmedStops =
      load?.stops.filter((stop) => !stop.appointmentConfirmedAt).length ?? 0;
    const attention =
      missing > 0 ||
      unconfirmedStops > 0 ||
      Boolean(load?.tasks.length) ||
      Boolean(load && !selectedCarrier);
    const category: LoadWorkspaceRow["category"] = !load
      ? missing
        ? "Intake"
        : !latestQuote
          ? "Awaiting quote"
          : latestQuote.status === "DRAFT" || latestQuote.status === "APPROVED"
            ? "Awaiting approval"
            : "Sourcing"
      : !selectedCarrier
        ? "Sourcing"
        : !load.driverAssignment
          ? "Dispatch pending"
          : latestTracking
            ? "In transit"
            : "Dispatch pending";
    return {
      id: request.id,
      number: load?.loadNumber ?? `REQ-${request.id.slice(0, 8).toUpperCase()}`,
      customer:
        load?.customer.name ??
        text(candidate.customerName, "Customer not identified"),
      origin: load?.stops[0]
        ? `${load.stops[0].city}, ${load.stops[0].state}`
        : location(candidate, "origin"),
      destination: load?.stops.at(-1)
        ? `${load.stops.at(-1)!.city}, ${load.stops.at(-1)!.state}`
        : location(candidate, "destination"),
      pickup: shortDate(load?.pickupDate ?? text(candidate.pickupDate, "")),
      delivery: shortDate(
        load?.deliveryDate ?? text(candidate.deliveryDate, ""),
      ),
      carrier: selectedCarrier?.carrierName ?? "Unassigned",
      driver: load?.driverAssignment?.driverName ?? "Driver not assigned",
      status:
        load?.status.replaceAll("_", " ") ??
        request.status.replaceAll("_", " "),
      health: missing > 0 ? "At risk" : attention ? "Watch" : "Healthy",
      tracking: latestTracking?.status ?? "Manual tracking not started",
      trackingFreshness: relativeTime(latestTracking?.occurredAt),
      revenueCents: latestQuote ? Number(latestQuote.amountCents) : undefined,
      carrierCostCents: selectedCarrier?.quotedCostCents
        ? Number(selectedCarrier.quotedCostCents)
        : undefined,
      nextAction:
        load?.nextAction ??
        (missing
          ? `Answer ${missing} missing shipment ${missing === 1 ? "question" : "questions"}`
          : !latestQuote
            ? "Create customer quote"
            : "Review quote status"),
      owner: load?.primaryOwner?.name ?? "Unassigned",
      href: load
        ? `/org/${slug}/loads/${load.id}`
        : `/org/${slug}/requests/${request.id}`,
      attention,
      category,
    };
  });
  return <LoadsWorkspaceView slug={slug} rows={rows} mode="staging" />;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function location(
  value: Record<string, unknown>,
  prefix: "origin" | "destination",
) {
  const city = text(value[`${prefix}City`], "Location pending");
  const state = text(value[`${prefix}State`], "");
  return state ? `${city}, ${state}` : city;
}
