import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import {
  approveRevision,
  createShipmentRequest,
} from "../../../packages/db/commands";
import {
  addCarrierCandidate,
  addTrackingUpdate,
  approveQuote,
  assignDriver,
  createQuote,
  createTask,
  logCommunication,
  selectCarrier,
  setLoadOwnership,
} from "../../../packages/db/operations";

const prisma = new PrismaClient();
const marker = "ATLAS_STAGING_PERSISTENCE_CHECK_V2";

const syntheticShipment = {
  customerName: "Atlas Synthetic Customer",
  originFacilityName: "Synthetic Origin",
  originCity: "Atlanta",
  originState: "GA",
  originPostalCode: "30303",
  destinationFacilityName: "Synthetic Destination",
  destinationCity: "Charlotte",
  destinationState: "NC",
  destinationPostalCode: "28202",
  commodity: "Packaged synthetic test freight",
  weightPounds: 24000,
  equipmentType: "DRY_VAN" as const,
  pickupDate: "2026-08-03",
  deliveryDate: "2026-08-05",
  hazmat: false,
};

async function signIn(email: string, passwordVariable: string) {
  const password = process.env[passwordVariable];
  if (!password) throw new Error(`Missing ${passwordVariable}`);
  const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
    }),
    emailAndPassword: { enabled: true, disableSignUp: true },
  });
  const result = await auth.api.signInEmail({ body: { email, password } });
  if (!result?.user?.id || !result.token) {
    throw new Error(`Staging sign-in verification failed for ${email}`);
  }
  return result.user.id;
}

async function main() {
  if (process.env.VERIFY_STAGING_DATA !== "true") {
    throw new Error(
      "Refusing to verify. Set VERIFY_STAGING_DATA=true for Atlas staging only.",
    );
  }

  const alexId = await signIn(
    "alex.sales@atlas-staging.invalid",
    "ATLAS_SEED_PASSWORD_ALEX",
  );
  const blairId = await signIn(
    "blair.approver@atlas-staging.invalid",
    "ATLAS_SEED_PASSWORD_BLAIR",
  );

  const existing = await prisma.shipmentRequestRevision.findFirst({
    where: {
      organization: { slug: "atlas-staging" },
      originalText: marker,
    },
    include: { shipmentRequest: { include: { load: true } } },
  });

  let requestId = existing?.shipmentRequestId;
  let loadId = existing?.shipmentRequest.load?.id;
  let persistence = "confirmed";
  if (!requestId) {
    const created = await createShipmentRequest(alexId, {
      organizationSlug: "atlas-staging",
      originalText: marker,
      structured: syntheticShipment,
    });
    requestId = created.requestId;
    loadId = await approveRevision(
      blairId,
      "atlas-staging",
      created.revisionId,
      `staging-self-check-${randomUUID()}`,
    );
    persistence = "initialized";
  }
  if (!loadId)
    throw new Error("Persistent staging verification load is missing");

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { slug: "atlas-staging" },
  });
  const requestCount = await prisma.shipmentRequest.count({
    where: { organizationId: organization.id },
  });
  for (let index = requestCount; index < 3; index += 1) {
    const drillMarker = `ATLAS_STAGING_DRILL_REQUEST_${index + 1}`;
    const created = await createShipmentRequest(alexId, {
      organizationSlug: "atlas-staging",
      originalText: drillMarker,
      structured:
        index === 2
          ? { customerName: "Atlas Incomplete Drill Request" }
          : {
              ...syntheticShipment,
              customerName: `Atlas Drill Customer ${index + 1}`,
              originFacilityName: `Drill Origin ${index + 1}`,
              destinationFacilityName: `Drill Destination ${index + 1}`,
            },
    });
    const currentLoads = await prisma.load.count({
      where: { organizationId: organization.id },
    });
    if (currentLoads < 2 && index !== 2)
      await approveRevision(
        blairId,
        "atlas-staging",
        created.revisionId,
        `staging-drill-approve-${index + 1}`,
      );
  }

  const drillLoad = await prisma.load.findUniqueOrThrow({
    where: { id: loadId },
    include: {
      carrierCandidates: true,
      trackingUpdates: true,
      communications: true,
      tasks: true,
      shipmentRequest: { include: { quotes: true } },
    },
  });
  if (!drillLoad.shipmentRequest.quotes.length) {
    const quoteId = await createQuote(alexId, "atlas-staging", {
      shipmentRequestId: requestId,
      amountCents: 285000,
      assumptions: "Synthetic staging drill rate; human reviewed",
    });
    await approveQuote(
      blairId,
      "atlas-staging",
      quoteId,
      "staging-drill-quote-approval-v1",
    );
  }
  let candidateId = drillLoad.carrierCandidates.find(
    (candidate) => candidate.carrierName === "Summit Staging Freight",
  )?.id;
  if (!candidateId)
    candidateId = await addCarrierCandidate(alexId, "atlas-staging", {
      loadId,
      carrierName: "Summit Staging Freight",
      authorityConfirmed: true,
      insuranceConfirmed: true,
      cargoCoverageCents: 15000000,
      quotedCostCents: 218000,
    });
  const candidate = await prisma.carrierCandidate.findUniqueOrThrow({
    where: { id: candidateId },
  });
  if (candidate.status === "QUALIFIED")
    await selectCarrier(
      alexId,
      "atlas-staging",
      candidateId,
      "staging-drill-carrier-select-v1",
    );
  const assignment = await prisma.driverAssignment.findUnique({
    where: { loadId },
  });
  if (!assignment)
    await assignDriver(alexId, "atlas-staging", {
      loadId,
      carrierCandidateId: candidateId,
      driverName: "Luis Martinez",
      driverPhone: "6155550187",
      dispatcherName: "Maya Chen",
      dispatcherPhone: "6155550133",
      tractorNumber: "STG-214",
      trailerNumber: "ATL-53",
    });
  if (!drillLoad.primaryOwnerId)
    await setLoadOwnership(alexId, "atlas-staging", {
      loadId,
      primaryOwnerId: alexId,
      nextAction: "Confirm delivery appointment and review tracking freshness",
    });
  if (!drillLoad.trackingUpdates.length)
    await addTrackingUpdate(alexId, "atlas-staging", {
      loadId,
      status: "IN_TRANSIT",
      location: "Greenville, SC",
      notes: "Synthetic manual staging check-in",
      occurredAt: new Date(),
    });
  if (!drillLoad.communications.length)
    await logCommunication(alexId, "atlas-staging", {
      loadId,
      channel: "PHONE",
      partyType: "DRIVER",
      partyName: "Luis Martinez",
      direction: "INBOUND",
      summary: "Driver confirmed on-time progress during staging drill",
      occurredAt: new Date(),
    });
  if (!drillLoad.tasks.length)
    await createTask(alexId, "atlas-staging", {
      loadId,
      title: "Confirm delivery appointment",
      assigneeId: alexId,
      dueAt: new Date(Date.now() + 86_400_000),
    });

  for (const userId of [alexId, blairId]) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId,
        organization: { slug: "atlas-staging" },
        status: "ACTIVE",
      },
    });
    if (!membership) throw new Error("Synthetic user cannot access staging");
    const visible = await prisma.shipmentRequest.count({
      where: { id: requestId, organizationId: membership.organizationId },
    });
    if (visible !== 1) throw new Error("Shared organization data check failed");
  }

  try {
    await createShipmentRequest(alexId, {
      organizationSlug: "atlas-isolation-check",
      originalText: marker,
      structured: syntheticShipment,
    });
    throw new Error(
      "Cross-organization isolation check unexpectedly succeeded",
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "NOT_FOUND") throw error;
  }

  console.log(
    `Staging verification passed: two sign-ins, shared organization access, cross-organization denial, persistence ${persistence}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Verification failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
