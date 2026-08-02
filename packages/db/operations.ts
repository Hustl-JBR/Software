import { createHash, randomUUID } from "node:crypto";
import { Prisma, type MembershipRole } from "@prisma/client";
import { z } from "zod";
import { authorizeAny, type Permission, type Role } from "../auth/policy";
import { prisma } from "./client";

type Context = {
  userId: string;
  organizationId: string;
  roles: MembershipRole[];
};

const id = z.string().uuid();
const required = z.string().trim().min(1).max(2_000);
const optional = z.string().trim().max(2_000).optional();
const cents = z.union([z.string(), z.number().int()]).transform((value) => {
  const parsed = BigInt(value);
  if (parsed < 0n) throw new Error("INVALID_MONEY");
  return parsed;
});

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
  const roles = Array.from(
    new Set([membership.role, ...membership.roles.map((item) => item.role)]),
  );
  authorizeAny(roles as Role[], permission);
  return { userId, organizationId: membership.organizationId, roles };
}

function audit(
  actor: Context,
  action: string,
  entityType: string,
  entityId: string,
  afterState: Prisma.InputJsonValue,
) {
  return {
    organizationId: actor.organizationId,
    actorType: "USER" as const,
    actorId: actor.userId,
    action,
    entityType,
    entityId,
    afterState,
    correlationId: randomUUID(),
  };
}

async function beginIdempotent(
  tx: Prisma.TransactionClient,
  actor: Context,
  command: string,
  key: string,
  subjectId: string,
) {
  if (!key || key.length > 200) throw new Error("INVALID_IDEMPOTENCY_KEY");
  const requestHash = createHash("sha256").update(subjectId).digest("hex");
  const existing = await tx.idempotencyRecord.findUnique({
    where: {
      organizationId_command_key: {
        organizationId: actor.organizationId,
        command,
        key,
      },
    },
  });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new Error("IDEMPOTENCY_KEY_REUSED");
    if (existing.resultEntityId) return existing.resultEntityId;
    throw new Error("COMMAND_IN_PROGRESS");
  }
  await tx.idempotencyRecord.create({
    data: {
      organizationId: actor.organizationId,
      command,
      key,
      requestHash,
    },
  });
  return null;
}

async function completeIdempotent(
  tx: Prisma.TransactionClient,
  actor: Context,
  command: string,
  key: string,
  resultEntityId: string,
) {
  await tx.idempotencyRecord.update({
    where: {
      organizationId_command_key: {
        organizationId: actor.organizationId,
        command,
        key,
      },
    },
    data: {
      status: "COMPLETED",
      resultEntityId,
      completedAt: new Date(),
    },
  });
}

export async function recordCustomerCall(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      shipmentRequestId: id.optional(),
      customerName: required,
      contactName: optional,
      notes: required,
      occurredAt: z.coerce.date(),
    })
    .parse(input);
  const actor = await context(userId, slug, "shipment.create");
  return prisma.$transaction(async (tx) => {
    if (data.shipmentRequestId) {
      const request = await tx.shipmentRequest.findUnique({
        where: {
          organizationId_id: {
            organizationId: actor.organizationId,
            id: data.shipmentRequestId,
          },
        },
      });
      if (!request) throw new Error("NOT_FOUND");
    }
    const call = await tx.customerCall.create({
      data: { organizationId: actor.organizationId, ...data },
    });
    await tx.auditEvent.create({
      data: audit(actor, "CUSTOMER_CALL_RECORDED", "CustomerCall", call.id, {
        customerName: call.customerName,
        occurredAt: call.occurredAt.toISOString(),
      }),
    });
    return call.id;
  });
}

export async function createQuote(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      shipmentRequestId: id,
      amountCents: cents,
      assumptions: optional,
    })
    .parse(input);
  const actor = await context(userId, slug, "quote.manage");
  return prisma.$transaction(async (tx) => {
    const request = await tx.shipmentRequest.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: data.shipmentRequestId,
        },
      },
    });
    if (!request) throw new Error("NOT_FOUND");
    const quote = await tx.quote.create({
      data: {
        organizationId: actor.organizationId,
        shipmentRequestId: data.shipmentRequestId,
        amountCents: data.amountCents,
        assumptions: data.assumptions,
        createdById: actor.userId,
      },
    });
    await tx.auditEvent.create({
      data: audit(actor, "QUOTE_CREATED", "Quote", quote.id, {
        amountCents: quote.amountCents.toString(),
        currency: quote.currency,
      }),
    });
    return quote.id;
  });
}

export async function approveQuote(
  userId: string,
  slug: string,
  quoteId: string,
  idempotencyKey: string,
) {
  const actor = await context(userId, slug, "quote.approve");
  return prisma.$transaction(async (tx) => {
    const prior = await beginIdempotent(
      tx,
      actor,
      "APPROVE_QUOTE",
      idempotencyKey,
      quoteId,
    );
    if (prior) return prior;
    const quote = await tx.quote.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: id.parse(quoteId),
        },
      },
    });
    if (!quote) throw new Error("NOT_FOUND");
    if (quote.createdById === actor.userId)
      throw new Error("SEPARATION_OF_DUTIES");
    if (quote.status !== "DRAFT") throw new Error("INVALID_STATE");
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "APPROVED",
        approvedById: actor.userId,
        approvedAt: new Date(),
      },
    });
    await tx.auditEvent.create({
      data: audit(actor, "QUOTE_APPROVED", "Quote", quote.id, {
        status: "APPROVED",
      }),
    });
    await completeIdempotent(
      tx,
      actor,
      "APPROVE_QUOTE",
      idempotencyKey,
      quote.id,
    );
    return quote.id;
  });
}

export async function acceptQuote(
  userId: string,
  slug: string,
  input: unknown,
  idempotencyKey: string,
) {
  const data = z.object({ quoteId: id, evidence: required }).parse(input);
  const actor = await context(userId, slug, "quote.manage");
  return prisma.$transaction(async (tx) => {
    const prior = await beginIdempotent(
      tx,
      actor,
      "ACCEPT_QUOTE",
      idempotencyKey,
      data.quoteId,
    );
    if (prior) return prior;
    const quote = await tx.quote.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: data.quoteId,
        },
      },
    });
    if (!quote) throw new Error("NOT_FOUND");
    if (quote.status !== "APPROVED") throw new Error("INVALID_STATE");
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptanceEvidence: data.evidence,
      },
    });
    await tx.auditEvent.create({
      data: audit(actor, "CUSTOMER_ACCEPTANCE_RECORDED", "Quote", quote.id, {
        status: "ACCEPTED",
      }),
    });
    await completeIdempotent(
      tx,
      actor,
      "ACCEPT_QUOTE",
      idempotencyKey,
      quote.id,
    );
    return quote.id;
  });
}

export async function addCarrierCandidate(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      loadId: id,
      carrierName: required,
      authorityConfirmed: z.boolean(),
      insuranceConfirmed: z.boolean(),
      cargoCoverageCents: cents.optional(),
      quotedCostCents: cents.optional(),
    })
    .parse(input);
  const actor = await context(userId, slug, "carrier.manage");
  return prisma.$transaction(async (tx) => {
    const load = await tx.load.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: data.loadId,
        },
      },
    });
    if (!load) throw new Error("NOT_FOUND");
    const blockReason = !data.authorityConfirmed
      ? "Operating authority has not been manually confirmed"
      : !data.insuranceConfirmed
        ? "Insurance has not been manually confirmed"
        : !data.cargoCoverageCents || data.cargoCoverageCents < 10_000_000n
          ? "Cargo coverage is below the synthetic staging minimum"
          : null;
    const candidate = await tx.carrierCandidate.create({
      data: {
        organizationId: actor.organizationId,
        ...data,
        status: blockReason ? "BLOCKED" : "QUALIFIED",
        blockReason,
      },
    });
    await tx.auditEvent.create({
      data: audit(
        actor,
        "CARRIER_CANDIDATE_ENTERED",
        "CarrierCandidate",
        candidate.id,
        { status: candidate.status, blockReason },
      ),
    });
    return candidate.id;
  });
}

export async function selectCarrier(
  userId: string,
  slug: string,
  candidateId: string,
  idempotencyKey: string,
) {
  const actor = await context(userId, slug, "carrier.select");
  return prisma.$transaction(async (tx) => {
    const parsedId = id.parse(candidateId);
    const prior = await beginIdempotent(
      tx,
      actor,
      "SELECT_CARRIER",
      idempotencyKey,
      parsedId,
    );
    if (prior) return prior;
    const candidate = await tx.carrierCandidate.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: parsedId,
        },
      },
    });
    if (!candidate) throw new Error("NOT_FOUND");
    if (candidate.status !== "QUALIFIED") throw new Error("CARRIER_BLOCKED");
    const selected = await tx.carrierCandidate.findFirst({
      where: {
        organizationId: actor.organizationId,
        loadId: candidate.loadId,
        status: "SELECTED",
      },
    });
    if (selected && selected.id !== candidate.id)
      throw new Error("CARRIER_ALREADY_SELECTED");
    await tx.carrierCandidate.update({
      where: { id: candidate.id },
      data: { status: "SELECTED", selectedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: audit(actor, "CARRIER_SELECTED", "CarrierCandidate", candidate.id, {
        status: "SELECTED",
      }),
    });
    await completeIdempotent(
      tx,
      actor,
      "SELECT_CARRIER",
      idempotencyKey,
      candidate.id,
    );
    return candidate.id;
  });
}

export async function assignDriver(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      loadId: id,
      carrierCandidateId: id,
      driverName: required,
      driverPhone: optional,
      dispatcherName: required,
      dispatcherPhone: optional,
      tractorNumber: optional,
      trailerNumber: optional,
    })
    .parse(input);
  const actor = await context(userId, slug, "load.update");
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.carrierCandidate.findUnique({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: data.carrierCandidateId,
        },
      },
    });
    if (!candidate || candidate.loadId !== data.loadId)
      throw new Error("NOT_FOUND");
    if (candidate.status !== "SELECTED")
      throw new Error("CARRIER_NOT_SELECTED");
    const assignment = await tx.driverAssignment.upsert({
      where: { loadId: data.loadId },
      update: data,
      create: { organizationId: actor.organizationId, ...data },
    });
    await tx.auditEvent.create({
      data: audit(
        actor,
        "DRIVER_ASSIGNMENT_RECORDED",
        "DriverAssignment",
        assignment.id,
        {
          loadId: data.loadId,
          carrierCandidateId: data.carrierCandidateId,
        },
      ),
    });
    return assignment.id;
  });
}

export async function confirmAppointment(
  userId: string,
  slug: string,
  stopId: string,
) {
  const actor = await context(userId, slug, "load.update");
  return prisma.$transaction(async (tx) => {
    const stop = await tx.loadStop.findFirst({
      where: { id: id.parse(stopId), organizationId: actor.organizationId },
    });
    if (!stop) throw new Error("NOT_FOUND");
    await tx.loadStop.update({
      where: { id: stop.id },
      data: { appointmentConfirmedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: audit(actor, "APPOINTMENT_CONFIRMED", "LoadStop", stop.id, {
        confirmed: true,
        type: stop.type,
      }),
    });
    return stop.id;
  });
}

export async function setLoadOwnership(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({ loadId: id, primaryOwnerId: id, nextAction: required })
    .parse(input);
  const actor = await context(userId, slug, "load.update");
  return prisma.$transaction(async (tx) => {
    const owner = await tx.organizationMembership.findFirst({
      where: {
        organizationId: actor.organizationId,
        userId: data.primaryOwnerId,
        status: "ACTIVE",
        user: { active: true },
      },
    });
    if (!owner) throw new Error("NOT_FOUND");
    const load = await tx.load.update({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: data.loadId,
        },
      },
      data: {
        primaryOwnerId: data.primaryOwnerId,
        nextAction: data.nextAction,
      },
    });
    await tx.auditEvent.create({
      data: audit(actor, "LOAD_OWNERSHIP_UPDATED", "Load", load.id, {
        primaryOwnerId: data.primaryOwnerId,
        nextAction: data.nextAction,
      }),
    });
    return load.id;
  });
}

export async function addTrackingUpdate(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      loadId: id,
      status: required,
      location: optional,
      notes: optional,
      occurredAt: z.coerce.date(),
    })
    .parse(input);
  const actor = await context(userId, slug, "load.update");
  return prisma.$transaction(async (tx) => {
    const update = await tx.trackingUpdate.create({
      data: { organizationId: actor.organizationId, ...data },
    });
    await tx.auditEvent.create({
      data: audit(
        actor,
        "TRACKING_UPDATE_RECORDED",
        "TrackingUpdate",
        update.id,
        { loadId: data.loadId, status: data.status },
      ),
    });
    return update.id;
  });
}

export async function logCommunication(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      loadId: id,
      channel: z.enum(["PHONE", "EMAIL", "SMS", "INTERNAL_NOTE"]),
      partyType: required,
      partyName: required,
      direction: z.enum(["INBOUND", "OUTBOUND"]),
      summary: required,
      occurredAt: z.coerce.date(),
    })
    .parse(input);
  const actor = await context(userId, slug, "load.update");
  return prisma.$transaction(async (tx) => {
    const communication = await tx.communicationLog.create({
      data: { organizationId: actor.organizationId, ...data },
    });
    await tx.auditEvent.create({
      data: audit(
        actor,
        "COMMUNICATION_LOGGED",
        "CommunicationLog",
        communication.id,
        {
          loadId: data.loadId,
          channel: data.channel,
          partyType: data.partyType,
        },
      ),
    });
    return communication.id;
  });
}

export async function createTask(userId: string, slug: string, input: unknown) {
  const data = z
    .object({
      loadId: id.optional(),
      title: required,
      assigneeId: id,
      dueAt: z.coerce.date().optional(),
    })
    .parse(input);
  const actor = await context(userId, slug, "task.manage");
  return prisma.$transaction(async (tx) => {
    const assignee = await tx.organizationMembership.findFirst({
      where: {
        organizationId: actor.organizationId,
        userId: data.assigneeId,
        status: "ACTIVE",
        user: { active: true },
      },
    });
    if (!assignee) throw new Error("NOT_FOUND");
    const task = await tx.task.create({
      data: { organizationId: actor.organizationId, ...data },
    });
    await tx.auditEvent.create({
      data: audit(actor, "TASK_CREATED", "Task", task.id, {
        title: task.title,
        assigneeId: task.assigneeId,
      }),
    });
    return task.id;
  });
}

export async function completeTask(
  userId: string,
  slug: string,
  taskId: string,
) {
  const actor = await context(userId, slug, "task.manage");
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: {
        organizationId_id: {
          organizationId: actor.organizationId,
          id: id.parse(taskId),
        },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: actor.userId,
      },
    });
    await tx.auditEvent.create({
      data: audit(actor, "TASK_COMPLETED", "Task", task.id, {
        status: "COMPLETED",
      }),
    });
    return task.id;
  });
}

export async function changeMembershipRoles(
  userId: string,
  slug: string,
  input: unknown,
) {
  const data = z
    .object({
      membershipId: id,
      roles: z.array(z.enum(["OPERATOR", "APPROVER", "VIEWER"])).min(1),
    })
    .parse(input);
  const actor = await context(userId, slug, "membership.manage");
  return prisma.$transaction(async (tx) => {
    const membership = await tx.organizationMembership.findFirst({
      where: { id: data.membershipId, organizationId: actor.organizationId },
    });
    if (!membership) throw new Error("NOT_FOUND");
    await tx.organizationMembershipRole.deleteMany({
      where: { membershipId: membership.id },
    });
    await tx.organizationMembershipRole.createMany({
      data: data.roles.map((role) => ({
        organizationId: actor.organizationId,
        membershipId: membership.id,
        userId: membership.userId,
        role,
      })),
    });
    await tx.auditEvent.create({
      data: audit(
        actor,
        "MEMBERSHIP_ROLES_CHANGED",
        "OrganizationMembership",
        membership.id,
        { roles: data.roles },
      ),
    });
    return membership.id;
  });
}
