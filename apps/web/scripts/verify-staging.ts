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
      status: "MANUAL_CHECK_CALL",
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

  // Exercise the complete Ready Operations lifecycle against the deployed schema.
  const readyCarrier = await prisma.carrier.upsert({
    where: {
      organizationId_legalName: {
        organizationId: organization.id,
        legalName: "Ready Verification Transport",
      },
    },
    update: {
      reviewStatus: "APPROVED",
      insuranceExpiration: new Date("2027-12-31"),
    },
    create: {
      organizationId: organization.id,
      legalName: "Ready Verification Transport",
      mcNumber: "MC-VERIFY",
      usdotNumber: "USDOT-VERIFY",
      contactName: "Verification Dispatcher",
      reviewStatus: "APPROVED",
      insuranceExpiration: new Date("2027-12-31"),
    },
  });
  const lifecycleQuote = await prisma.quote.findFirst({
    where: { organizationId: organization.id, shipmentRequestId: requestId },
    orderBy: { createdAt: "desc" },
  });
  if (!lifecycleQuote) throw new Error("Ready lifecycle quote is missing");
  await prisma.quote.update({
    where: { id: lifecycleQuote.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      quoteNumber: lifecycleQuote.quoteNumber || "RFQ-VERIFY",
      pickupAddress: "100 Test Way, Atlanta, GA 30303",
      deliveryAddress: "200 Review Ave, Charlotte, NC 28202",
      pickupDate: new Date("2026-08-03"),
      deliveryDate: new Date("2026-08-05"),
      equipmentType: "53' Dry Van",
      commodity: syntheticShipment.commodity,
      weightPounds: syntheticShipment.weightPounds,
      estimatedCarrierCostCents: 218000n,
    },
  });
  await prisma.quote.update({
    where: { id: lifecycleQuote.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptanceEvidence: "Automated staging lifecycle verification",
    },
  });
  await prisma.load.update({
    where: { id: loadId },
    data: {
      status: "UNCOVERED",
      customerPriceCents: lifecycleQuote.amountCents,
      estimatedMileage: 245,
      datPostedAt: new Date(),
      datPostingReference: "DAT-VERIFY",
      carrierId: readyCarrier.id,
      carrierCostCents: 218000n,
    },
  });
  await prisma.load.update({
    where: { id: loadId },
    data: { status: "BOOKED" },
  });
  for (const type of [
    "RATE_CONFIRMATION",
    "SIGNED_RATE_CONFIRMATION",
  ] as const) {
    const exists = await prisma.loadDocument.findFirst({
      where: { organizationId: organization.id, loadId, type },
    });
    if (!exists)
      await prisma.loadDocument.create({
        data: {
          organizationId: organization.id,
          loadId,
          type,
          fileName: `${type.toLowerCase()}.pdf`,
          mimeType: "application/pdf",
          content: Buffer.from("Synthetic verification document"),
          uploadedById: alexId,
        },
      });
  }
  for (const status of [
    "DISPATCHED",
    "AT_PICKUP",
    "IN_TRANSIT",
    "AT_DELIVERY",
    "DELIVERED",
  ] as const) {
    await prisma.load.update({
      where: { id: loadId },
      data: {
        status,
        deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        deliveryReceiver:
          status === "DELIVERED" ? "Verification Receiver" : undefined,
      },
    });
    await prisma.trackingUpdate.create({
      data: {
        organizationId: organization.id,
        loadId,
        status,
        occurredAt: new Date(),
        notes: "Ready Operations lifecycle verification",
      },
    });
  }
  const pod = await prisma.loadDocument.findFirst({
    where: { organizationId: organization.id, loadId, type: "POD" },
  });
  if (!pod)
    await prisma.loadDocument.create({
      data: {
        organizationId: organization.id,
        loadId,
        type: "POD",
        fileName: "verification-pod.pdf",
        mimeType: "application/pdf",
        content: Buffer.from("Synthetic POD"),
        uploadedById: alexId,
      },
    });
  await prisma.customerInvoice.upsert({
    where: { loadId },
    update: { status: "PAID", paidCents: lifecycleQuote.amountCents },
    create: {
      organizationId: organization.id,
      loadId,
      invoiceNumber: `INV-VERIFY-${loadId.slice(0, 6)}`,
      freightChargeCents: lifecycleQuote.amountCents,
      status: "PAID",
      paidCents: lifecycleQuote.amountCents,
      paymentTerms: "Net 30",
    },
  });
  await prisma.carrierBill.upsert({
    where: { loadId },
    update: { status: "PAID", linehaulCents: 218000n, paidCents: 218000n },
    create: {
      organizationId: organization.id,
      loadId,
      carrierInvoiceNumber: "CINV-VERIFY",
      status: "PAID",
      linehaulCents: 218000n,
      paidCents: 218000n,
    },
  });
  await prisma.load.update({
    where: { id: loadId },
    data: { status: "COMPLETED" },
  });
  const verifiedLoad = await prisma.load.findFirstOrThrow({
    where: { id: loadId, organizationId: organization.id },
    include: {
      carrier: true,
      documents: true,
      customerInvoice: true,
      carrierBill: true,
    },
  });
  if (
    verifiedLoad.status !== "COMPLETED" ||
    verifiedLoad.carrier?.reviewStatus !== "APPROVED" ||
    !verifiedLoad.documents.some((document) => document.type === "POD") ||
    verifiedLoad.customerInvoice?.status !== "PAID" ||
    verifiedLoad.carrierBill?.status !== "PAID"
  )
    throw new Error("Ready Operations lifecycle verification failed");

  console.log(
    `Staging verification passed: full Ready Operations quote-to-completion lifecycle, two sign-ins, shared organization access, cross-organization denial, persistence ${persistence}.`,
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
