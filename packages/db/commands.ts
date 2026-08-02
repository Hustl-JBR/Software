import { createHash, randomUUID } from "node:crypto";
import { Prisma, type Facility, type MembershipRole } from "@prisma/client";
import { prisma } from "./client";
import { authorizeAny, type Permission, type Role } from "../auth/policy";
import { effectiveRoles } from "../auth/membership";
import {
  shipmentRequestCommandSchema,
  validateCandidate,
  type ShipmentCandidate,
  type ShipmentIssue,
} from "../domain/shipment";
import { DeterministicMockExtractionAdapter } from "../integrations/extraction";
import {
  localDateTimeToInstant,
  type LocalTimeDisambiguation,
} from "../domain/timezone";

export type ActorContext = {
  userId: string;
  organizationId: string;
  role: MembershipRole;
  roles: MembershipRole[];
};

async function requireContext(
  userId: string,
  organizationSlug: string,
  permission: Permission,
): Promise<ActorContext> {
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      organization: { slug: organizationSlug },
      status: "ACTIVE",
    },
    include: { roles: true },
  });
  if (!membership) throw new Error("NOT_FOUND");
  const roles = effectiveRoles(
    membership.role,
    membership.roles.map((item) => item.role),
  );
  authorizeAny(roles as Role[], permission);
  return {
    userId,
    organizationId: membership.organizationId,
    role: membership.role,
    roles,
  };
}

const audit = (
  context: ActorContext,
  correlationId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterState: Prisma.InputJsonValue,
  metadata?: Prisma.InputJsonValue,
) => ({
  organizationId: context.organizationId,
  actorType: "USER" as const,
  actorId: context.userId,
  action,
  entityType,
  entityId,
  afterState,
  metadata,
  correlationId,
});

export async function createShipmentRequest(userId: string, input: unknown) {
  const command = shipmentRequestCommandSchema.parse(input);
  const context = await requireContext(
    userId,
    command.organizationSlug,
    "shipment.create",
  );
  const correlationId = randomUUID();
  const extraction = await new DeterministicMockExtractionAdapter().extract({
    originalText: command.originalText,
    structured: command.structured,
  });
  return prisma.$transaction(async (tx) => {
    const request = await tx.shipmentRequest.create({
      data: { organizationId: context.organizationId },
    });
    const revision = await tx.shipmentRequestRevision.create({
      data: {
        organizationId: context.organizationId,
        shipmentRequestId: request.id,
        revisionNumber: 1,
        originalText: command.originalText,
        structuredData: extraction.candidates as Prisma.InputJsonValue,
        extractionMetadata: {
          provider: extraction.provider,
          providerVersion: extraction.providerVersion,
          schemaVersion: extraction.schemaVersion,
          sourceReferences: extraction.sourceReferences,
        },
        validationResults: toJson({ issues: extraction.issues }),
        createdById: context.userId,
      },
    });
    if (extraction.issues.length)
      await tx.shipmentIssue.createMany({
        data: extraction.issues.map((issue) =>
          issueData(context, request.id, revision.id, issue),
        ),
      });
    await tx.auditEvent.createMany({
      data: [
        audit(
          context,
          correlationId,
          "SHIPMENT_REQUEST_CREATED",
          "ShipmentRequest",
          request.id,
          { status: request.status },
        ),
        audit(
          context,
          correlationId,
          "MOCK_EXTRACTION_COMPLETED",
          "ShipmentRequestRevision",
          revision.id,
          {
            provider: extraction.provider,
            issueCount: extraction.issues.length,
          },
        ),
        audit(
          context,
          correlationId,
          "REVISION_CREATED",
          "ShipmentRequestRevision",
          revision.id,
          { revisionNumber: 1 },
        ),
      ],
    });
    return { requestId: request.id, revisionId: revision.id };
  });
}

export async function correctShipmentRequest(
  userId: string,
  organizationSlug: string,
  requestId: string,
  candidate: unknown,
) {
  const context = await requireContext(
    userId,
    organizationSlug,
    "shipment.review",
  );
  const validation = validateCandidate(candidate);
  const correlationId = randomUUID();
  return prisma.$transaction(async (tx) => {
    const request = await tx.shipmentRequest.findUnique({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: requestId,
        },
      },
      include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });
    if (!request) throw new Error("NOT_FOUND");
    if (request.status === "APPROVED") throw new Error("ALREADY_APPROVED");
    const previous = request.revisions[0];
    const revisionNumber = previous.revisionNumber + 1;
    const issues = validation.success ? [] : validation.issues;
    const revision = await tx.shipmentRequestRevision.create({
      data: {
        organizationId: context.organizationId,
        shipmentRequestId: request.id,
        revisionNumber,
        originalText: previous.originalText,
        structuredData: candidate as Prisma.InputJsonValue,
        extractionMetadata: {
          type: "HUMAN_CORRECTION",
          basedOnRevisionId: previous.id,
          schemaVersion: "1",
        },
        validationResults: toJson({ issues }),
        createdById: context.userId,
      },
    });
    if (issues.length)
      await tx.shipmentIssue.createMany({
        data: issues.map((issue) =>
          issueData(context, request.id, revision.id, issue),
        ),
      });
    await tx.shipmentRequest.update({
      where: { id: request.id },
      data: { currentRevisionNumber: revisionNumber },
    });
    await tx.auditEvent.createMany({
      data: [
        audit(
          context,
          correlationId,
          "REVISION_CREATED",
          "ShipmentRequestRevision",
          revision.id,
          { revisionNumber },
        ),
        {
          ...audit(
            context,
            correlationId,
            "REVISION_CORRECTED",
            "ShipmentRequestRevision",
            revision.id,
            { revisionNumber },
          ),
          beforeState: {
            revisionId: previous.id,
            revisionNumber: previous.revisionNumber,
          },
        },
      ],
    });
    return revision.id;
  });
}

export async function approveRevision(
  userId: string,
  organizationSlug: string,
  revisionId: string,
  idempotencyKey: string,
) {
  const context = await requireContext(
    userId,
    organizationSlug,
    "shipment.approve",
  );
  if (!idempotencyKey || idempotencyKey.length > 200)
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  const requestHash = createHash("sha256").update(revisionId).digest("hex");
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.idempotencyRecord.findUnique({
        where: {
          organizationId_command_key: {
            organizationId: context.organizationId,
            command: "APPROVE_SHIPMENT_REVISION",
            key: idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new Error("IDEMPOTENCY_KEY_REUSED");
        if (existing.resultEntityId) return existing.resultEntityId;
        throw new Error("APPROVAL_IN_PROGRESS");
      }
      await tx.idempotencyRecord.create({
        data: {
          organizationId: context.organizationId,
          command: "APPROVE_SHIPMENT_REVISION",
          key: idempotencyKey,
          requestHash,
        },
      });
      const revision = await tx.shipmentRequestRevision.findUnique({
        where: {
          organizationId_id: {
            organizationId: context.organizationId,
            id: revisionId,
          },
        },
        include: { shipmentRequest: true },
      });
      if (!revision) throw new Error("NOT_FOUND");
      if (
        revision.shipmentRequest.currentRevisionNumber !==
        revision.revisionNumber
      )
        throw new Error("STALE_REVISION");
      const validation = validateCandidate(revision.structuredData);
      if (!validation.success)
        throw new Error(
          `INVALID_REVISION:${validation.issues.map((issue) => issue.message).join("; ")}`,
        );
      const data = validation.data;
      const facilityIds = [
        data.originFacilityId,
        data.destinationFacilityId,
      ].filter((value): value is string => Boolean(value));
      const facilities = facilityIds.length
        ? await tx.facility.findMany({
            where: {
              organizationId: context.organizationId,
              id: { in: facilityIds },
              status: "ACTIVE",
            },
          })
        : [];
      if (facilities.length !== new Set(facilityIds).size)
        throw new Error("FACILITY_NOT_FOUND");
      const facilityMap = new Map(
        facilities.map((facility) => [facility.id, facility]),
      );
      const existingLoad = await tx.load.findUnique({
        where: { shipmentRequestId: revision.shipmentRequestId },
      });
      if (existingLoad) throw new Error("REVISION_ALREADY_APPROVED");
      const correlationId = randomUUID();
      const customer = await tx.customer.upsert({
        where: {
          organizationId_name: {
            organizationId: context.organizationId,
            name: data.customerName,
          },
        },
        update: {},
        create: {
          organizationId: context.organizationId,
          name: data.customerName,
        },
      });
      const approval = await tx.approvalRequest.create({
        data: {
          organizationId: context.organizationId,
          shipmentRequestId: revision.shipmentRequestId,
          revisionId,
          approvedById: context.userId,
          decisionReason:
            "Reviewed shipment revision approved for draft load creation",
        },
      });
      const load = await tx.load.create({
        data: {
          organizationId: context.organizationId,
          shipmentRequestId: revision.shipmentRequestId,
          approvedRevisionId: revision.id,
          customerId: customer.id,
          loadNumber: `ATL-${revision.shipmentRequestId.slice(0, 8).toUpperCase()}`,
          status: "DRAFT",
          commodity: data.commodity,
          weightPounds: data.weightPounds,
          equipmentType: data.equipmentType,
          equipmentDetail: data.equipmentDetail || null,
          pickupDate: new Date(`${data.pickupDate}T00:00:00.000Z`),
          deliveryDate: new Date(`${data.deliveryDate}T00:00:00.000Z`),
        },
      });
      const stops = await tx.loadStop.createMany({
        data: stopData(context.organizationId, load.id, data, facilityMap),
      });
      await tx.loadStatusHistory.create({
        data: {
          organizationId: context.organizationId,
          loadId: load.id,
          toStatus: "DRAFT",
          actorId: context.userId,
          reason: "Created from approved shipment revision",
        },
      });
      await tx.shipmentRequest.update({
        where: { id: revision.shipmentRequestId },
        data: { status: "APPROVED" },
      });
      await tx.auditEvent.createMany({
        data: [
          audit(
            context,
            correlationId,
            "APPROVAL_REQUESTED",
            "ApprovalRequest",
            approval.id,
            { revisionId },
          ),
          audit(
            context,
            correlationId,
            "APPROVAL_ACCEPTED",
            "ApprovalRequest",
            approval.id,
            { revisionId },
          ),
          audit(context, correlationId, "DRAFT_LOAD_CREATED", "Load", load.id, {
            loadNumber: load.loadNumber,
            status: "DRAFT",
          }),
          audit(context, correlationId, "STOPS_CREATED", "Load", load.id, {
            count: stops.count,
          }),
          audit(
            context,
            correlationId,
            "LOAD_STATUS_INITIALIZED",
            "Load",
            load.id,
            { status: "DRAFT" },
          ),
        ],
      });
      await tx.idempotencyRecord.update({
        where: {
          organizationId_command_key: {
            organizationId: context.organizationId,
            command: "APPROVE_SHIPMENT_REVISION",
            key: idempotencyKey,
          },
        },
        data: {
          status: "COMPLETED",
          resultEntityId: load.id,
          completedAt: new Date(),
        },
      });
      return load.id;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function issueData(
  context: ActorContext,
  requestId: string,
  revisionId: string,
  issue: ShipmentIssue,
) {
  return {
    organizationId: context.organizationId,
    shipmentRequestId: requestId,
    revisionId,
    type: issue.type,
    field: issue.field,
    message: issue.message,
    sourceReference: issue.sourceReference,
  };
}
function stopData(
  organizationId: string,
  loadId: string,
  data: ShipmentCandidate,
  facilities: Map<string, Facility>,
) {
  const origin = data.originFacilityId
    ? facilities.get(data.originFacilityId)
    : undefined;
  const destination = data.destinationFacilityId
    ? facilities.get(data.destinationFacilityId)
    : undefined;
  const pickupZone = origin?.timeZone ?? (data.originTimeZone || undefined);
  const deliveryZone =
    destination?.timeZone ?? (data.destinationTimeZone || undefined);
  const pickupStart = appointment(
    data.pickupAppointmentStart,
    pickupZone,
    data.pickupAppointmentDisambiguation,
  );
  const pickupEnd = appointment(
    data.pickupAppointmentEnd,
    pickupZone,
    data.pickupAppointmentDisambiguation,
  );
  const deliveryStart = appointment(
    data.deliveryAppointmentStart,
    deliveryZone,
    data.deliveryAppointmentDisambiguation,
  );
  const deliveryEnd = appointment(
    data.deliveryAppointmentEnd,
    deliveryZone,
    data.deliveryAppointmentDisambiguation,
  );
  if (pickupStart && pickupEnd && pickupEnd <= pickupStart)
    throw new Error("INVALID_PICKUP_APPOINTMENT_WINDOW");
  if (deliveryStart && deliveryEnd && deliveryEnd <= deliveryStart)
    throw new Error("INVALID_DELIVERY_APPOINTMENT_WINDOW");
  return [
    {
      organizationId,
      loadId,
      sequence: 1,
      type: "PICKUP" as const,
      ...stopLocation(origin, {
        facilityName: data.originFacilityName,
        addressLine1: data.originAddressLine1,
        addressLine2: data.originAddressLine2,
        city: data.originCity,
        state: data.originState,
        postalCode: data.originPostalCode,
        timeZone: pickupZone,
      }),
      appointmentStart: pickupStart,
      appointmentEnd: pickupEnd,
      appointmentLocalStart: data.pickupAppointmentStart || undefined,
      appointmentLocalEnd: data.pickupAppointmentEnd || undefined,
      appointmentTimeZone: pickupZone,
      instructions: data.specialInstructions || undefined,
    },
    {
      organizationId,
      loadId,
      sequence: 2,
      type: "DELIVERY" as const,
      ...stopLocation(destination, {
        facilityName: data.destinationFacilityName,
        addressLine1: data.destinationAddressLine1,
        addressLine2: data.destinationAddressLine2,
        city: data.destinationCity,
        state: data.destinationState,
        postalCode: data.destinationPostalCode,
        timeZone: deliveryZone,
      }),
      appointmentStart: deliveryStart,
      appointmentEnd: deliveryEnd,
      appointmentLocalStart: data.deliveryAppointmentStart || undefined,
      appointmentLocalEnd: data.deliveryAppointmentEnd || undefined,
      appointmentTimeZone: deliveryZone,
      instructions: data.specialInstructions || undefined,
    },
  ];
}

function appointment(
  value: string | undefined,
  timeZone: string | undefined,
  disambiguation: "" | LocalTimeDisambiguation | undefined,
) {
  if (!value) return undefined;
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return new Date(value);
  if (!timeZone) throw new Error("APPOINTMENT_TIME_ZONE_REQUIRED");
  return localDateTimeToInstant(value, timeZone, disambiguation || "REJECT")
    .instant;
}

function stopLocation(
  facility: Facility | undefined,
  manual: {
    facilityName: string;
    addressLine1?: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    timeZone?: string;
  },
) {
  if (!facility)
    return {
      ...manual,
      countryCode: "US",
      formattedAddress: [
        manual.addressLine1,
        manual.addressLine2,
        `${manual.city}, ${manual.state} ${manual.postalCode}`,
      ]
        .filter(Boolean)
        .join(", "),
      validationStatus: "MANUALLY_CONFIRMED" as const,
      manuallyEntered: true,
    };
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

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
