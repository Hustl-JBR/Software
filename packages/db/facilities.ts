import { createHash, randomUUID } from "node:crypto";
import { Prisma, type MembershipRole } from "@prisma/client";
import { z } from "zod";
import { authorizeAny, type Permission, type Role } from "../auth/policy";
import { effectiveRoles } from "../auth/membership";
import { isIanaTimeZone } from "../domain/timezone";
import type {
  LocationProvider,
  ResolvedLocation,
} from "../integrations/location";
import type { RoutingProvider } from "../integrations/routing";
import { prisma } from "./client";

const optional = z.string().trim().max(2_000).optional();
const facilityInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    addressLine1: z.string().trim().min(1).max(300),
    addressLine2: z.string().trim().max(300).optional(),
    city: z.string().trim().min(1).max(100),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}(?:-\d{4})?$/),
    countryCode: z.string().trim().toUpperCase().length(2).default("US"),
    timeZone: z
      .string()
      .trim()
      .refine(isIanaTimeZone, "Invalid IANA time zone"),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    phone: z.string().trim().max(50).optional(),
    shippingHours: optional,
    receivingHours: optional,
    appointmentRequired: z.boolean().default(false),
    appointmentInstructions: optional,
    internalNotes: optional,
    externalPlaceId: z.string().trim().max(300).optional(),
    providerSessionToken: z.string().uuid().optional(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined) === (input.longitude === undefined),
    { message: "Latitude and longitude must be supplied together" },
  );

type Context = {
  userId: string;
  organizationId: string;
  roles: MembershipRole[];
};

async function context(
  userId: string,
  organizationSlug: string,
  permission: Permission,
): Promise<Context> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      user: { active: true },
      organization: { slug: organizationSlug },
    },
    include: { roles: true },
  });
  if (!membership) throw new Error("NOT_FOUND");
  const roles = effectiveRoles(
    membership.role,
    membership.roles.map((item) => item.role),
  );
  authorizeAny(roles as Role[], permission);
  return { userId, organizationId: membership.organizationId, roles };
}

export async function createFacility(
  userId: string,
  organizationSlug: string,
  rawInput: unknown,
  provider?: LocationProvider,
) {
  const ctx = await context(userId, organizationSlug, "facility.manage");
  const input = facilityInput.parse(rawInput);
  let resolved: ResolvedLocation | undefined;
  if (input.externalPlaceId) {
    if (!input.providerSessionToken || !provider?.available)
      throw new Error("LOCATION_PROVIDER_UNAVAILABLE");
    resolved = await provider.resolve(
      input.externalPlaceId,
      input.providerSessionToken,
    );
  }
  const location = resolved ?? {
    provider: undefined,
    placeId: undefined,
    name: input.name,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    countryCode: input.countryCode,
    formattedAddress: formatAddress(input),
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
    validationStatus: "MANUALLY_CONFIRMED" as const,
  };
  const correlationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name || location.name,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        postalCode: location.postalCode,
        countryCode: location.countryCode,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        timeZone: location.timeZone,
        externalProvider: location.provider,
        externalPlaceId: location.placeId,
        validationStatus: location.validationStatus,
        manuallyEntered: !resolved,
        phone: input.phone,
        shippingHours: input.shippingHours,
        receivingHours: input.receivingHours,
        appointmentRequired: input.appointmentRequired,
        appointmentInstructions: input.appointmentInstructions,
        internalNotes: input.internalNotes,
        createdById: ctx.userId,
        updatedById: ctx.userId,
      },
    });
    await tx.auditEvent.create({
      data: audit(ctx, correlationId, "FACILITY_CREATED", facility.id, {
        name: facility.name,
        validationStatus: facility.validationStatus,
        manuallyEntered: facility.manuallyEntered,
      }),
    });
    return facility.id;
  });
}

export async function archiveFacility(
  userId: string,
  organizationSlug: string,
  facilityId: string,
) {
  const ctx = await context(userId, organizationSlug, "facility.manage");
  const before = await prisma.facility.findUnique({
    where: {
      organizationId_id: { organizationId: ctx.organizationId, id: facilityId },
    },
  });
  if (!before) throw new Error("NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.update({
      where: { id: before.id },
      data: {
        status: "INACTIVE",
        archivedAt: new Date(),
        updatedById: ctx.userId,
      },
    });
    await tx.auditEvent.create({
      data: {
        ...audit(ctx, randomUUID(), "FACILITY_ARCHIVED", facility.id, {
          status: facility.status,
        }),
        beforeState: { status: before.status },
      },
    });
    return facility.id;
  });
}

export async function updateFacility(
  userId: string,
  organizationSlug: string,
  facilityId: string,
  rawInput: unknown,
) {
  const ctx = await context(userId, organizationSlug, "facility.manage");
  const input = facilityInput.parse(rawInput);
  const before = await prisma.facility.findUnique({
    where: {
      organizationId_id: { organizationId: ctx.organizationId, id: facilityId },
    },
  });
  if (!before) throw new Error("NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.update({
      where: { id: before.id },
      data: {
        name: input.name,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        formattedAddress: formatAddress(input),
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: input.timeZone,
        phone: input.phone,
        shippingHours: input.shippingHours,
        receivingHours: input.receivingHours,
        appointmentRequired: input.appointmentRequired,
        appointmentInstructions: input.appointmentInstructions,
        internalNotes: input.internalNotes,
        externalProvider: null,
        externalPlaceId: null,
        validationStatus: "MANUALLY_CONFIRMED",
        manuallyEntered: true,
        updatedById: ctx.userId,
      },
    });
    await tx.auditEvent.create({
      data: {
        ...audit(ctx, randomUUID(), "FACILITY_UPDATED", facility.id, {
          name: facility.name,
          validationStatus: facility.validationStatus,
          manuallyEntered: facility.manuallyEntered,
        }),
        beforeState: {
          name: before.name,
          formattedAddress: before.formattedAddress,
          timeZone: before.timeZone,
          validationStatus: before.validationStatus,
        },
      },
    });
    return facility.id;
  });
}

export async function attachFacilityToStop(
  userId: string,
  organizationSlug: string,
  stopId: string,
  facilityId: string,
) {
  const ctx = await context(userId, organizationSlug, "load.update");
  const [stop, facility] = await Promise.all([
    prisma.loadStop.findFirst({
      where: { id: stopId, organizationId: ctx.organizationId },
    }),
    prisma.facility.findUnique({
      where: {
        organizationId_id: {
          organizationId: ctx.organizationId,
          id: facilityId,
        },
      },
    }),
  ]);
  if (!stop || !facility || facility.status !== "ACTIVE")
    throw new Error("NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    await tx.loadStop.update({
      where: { id: stop.id },
      data: snapshot(facility),
    });
    await tx.auditEvent.create({
      data: {
        ...audit(ctx, randomUUID(), "FACILITY_ATTACHED_TO_STOP", stop.id, {
          facilityId: facility.id,
          facilityName: facility.name,
        }),
        entityType: "LoadStop",
        beforeState: { facilityId: stop.facilityId },
      },
    });
    return stop.id;
  });
}

export async function calculateRouteSnapshot(
  userId: string,
  organizationSlug: string,
  loadId: string,
  idempotencyKey: string,
  provider: RoutingProvider,
) {
  const ctx = await context(userId, organizationSlug, "route.calculate");
  if (!provider.available) throw new Error("ROUTING_PROVIDER_UNAVAILABLE");
  const load = await prisma.load.findUnique({
    where: {
      organizationId_id: { organizationId: ctx.organizationId, id: loadId },
    },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });
  if (!load) throw new Error("NOT_FOUND");
  const coordinates = load.stops.map((stop) => ({
    latitude: stop.latitude?.toNumber(),
    longitude: stop.longitude?.toNumber(),
  }));
  if (
    coordinates.length < 2 ||
    coordinates.some(
      (point) => point.latitude === undefined || point.longitude === undefined,
    )
  )
    throw new Error("ROUTE_STOP_COORDINATES_REQUIRED");
  const points = coordinates as Array<{ latitude: number; longitude: number }>;
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ loadId, points, provider: provider.name }))
    .digest("hex");
  if (!idempotencyKey || idempotencyKey.length > 200)
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  const idempotency = await prisma.idempotencyRecord.findUnique({
    where: {
      organizationId_command_key: {
        organizationId: ctx.organizationId,
        command: "CALCULATE_GENERAL_ROUTE",
        key: idempotencyKey,
      },
    },
  });
  if (idempotency) {
    if (idempotency.requestHash !== requestHash)
      throw new Error("IDEMPOTENCY_KEY_REUSED");
    if (idempotency.resultEntityId) return idempotency.resultEntityId;
    throw new Error("ROUTE_CALCULATION_IN_PROGRESS");
  }
  const existing = await prisma.routeSnapshot.findUnique({
    where: {
      organizationId_loadId_requestHash: {
        organizationId: ctx.organizationId,
        loadId,
        requestHash,
      },
    },
  });
  if (existing) {
    await prisma.idempotencyRecord.create({
      data: {
        organizationId: ctx.organizationId,
        command: "CALCULATE_GENERAL_ROUTE",
        key: idempotencyKey,
        requestHash,
        status: "COMPLETED",
        resultEntityId: existing.id,
        completedAt: new Date(),
      },
    });
    return existing.id;
  }
  const estimate = await provider.calculate(points);
  return prisma.$transaction(async (tx) => {
    await tx.idempotencyRecord.create({
      data: {
        organizationId: ctx.organizationId,
        command: "CALCULATE_GENERAL_ROUTE",
        key: idempotencyKey,
        requestHash,
      },
    });
    await tx.routeSnapshot.updateMany({
      where: { organizationId: ctx.organizationId, loadId, status: "CURRENT" },
      data: { status: "STALE" },
    });
    const route = await tx.routeSnapshot.create({
      data: {
        organizationId: ctx.organizationId,
        loadId,
        provider: estimate.provider,
        routeType: estimate.routeType,
        stopCoordinates: points,
        distanceMeters: estimate.distanceMeters,
        durationSeconds: estimate.durationSeconds,
        encodedPolyline: estimate.encodedPolyline,
        calculatedAt: estimate.calculatedAt,
        providerVersion: estimate.providerVersion,
        equipmentContext: {
          type: load.equipmentType,
          detail: load.equipmentDetail,
          appliedToRoute: false,
        },
        warning: estimate.warning,
        requestHash,
        createdById: ctx.userId,
      },
    });
    await tx.providerUsageLog.create({
      data: {
        organizationId: ctx.organizationId,
        provider: provider.name,
        operation: "ROUTE_CALCULATION",
        outcome: "SUCCESS",
        actorId: ctx.userId,
      },
    });
    await tx.auditEvent.create({
      data: audit(
        ctx,
        randomUUID(),
        "GENERAL_ROUTE_ESTIMATE_CREATED",
        route.id,
        {
          loadId,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          warning: route.warning,
        },
      ),
    });
    await tx.idempotencyRecord.update({
      where: {
        organizationId_command_key: {
          organizationId: ctx.organizationId,
          command: "CALCULATE_GENERAL_ROUTE",
          key: idempotencyKey,
        },
      },
      data: {
        status: "COMPLETED",
        resultEntityId: route.id,
        completedAt: new Date(),
      },
    });
    return route.id;
  });
}

function formatAddress(input: z.infer<typeof facilityInput>) {
  return [
    input.addressLine1,
    input.addressLine2,
    `${input.city}, ${input.state} ${input.postalCode}`,
    input.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function snapshot(facility: {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  formattedAddress: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  timeZone: string;
  externalProvider: string | null;
  externalPlaceId: string | null;
  validationStatus:
    | "VALIDATED"
    | "NEEDS_REVIEW"
    | "MANUALLY_CONFIRMED"
    | "INCOMPLETE"
    | "PROVIDER_UNAVAILABLE";
  manuallyEntered: boolean;
}) {
  return {
    facilityId: facility.id,
    facilityName: facility.name,
    addressLine1: facility.addressLine1,
    addressLine2: facility.addressLine2,
    city: facility.city,
    state: facility.state,
    postalCode: facility.postalCode,
    countryCode: facility.countryCode,
    formattedAddress: facility.formattedAddress,
    latitude: facility.latitude,
    longitude: facility.longitude,
    timeZone: facility.timeZone,
    externalProvider: facility.externalProvider,
    externalPlaceId: facility.externalPlaceId,
    validationStatus: facility.validationStatus,
    manuallyEntered: facility.manuallyEntered,
  };
}

function audit(
  ctx: Context,
  correlationId: string,
  action: string,
  entityId: string,
  afterState: Prisma.InputJsonValue,
) {
  return {
    organizationId: ctx.organizationId,
    actorType: "USER" as const,
    actorId: ctx.userId,
    action,
    entityType: "Facility",
    entityId,
    afterState,
    correlationId,
  };
}
