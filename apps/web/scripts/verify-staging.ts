import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import {
  approveRevision,
  createShipmentRequest,
} from "../../../packages/db/commands";

const prisma = new PrismaClient();
const marker = "ATLAS_STAGING_PERSISTENCE_CHECK_V1";

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
