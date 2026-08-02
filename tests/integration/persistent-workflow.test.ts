import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  approveRevision,
  createShipmentRequest,
} from "../../packages/db/commands";
import {
  acceptQuote,
  addCarrierCandidate,
  addTrackingUpdate,
  approveQuote,
  assignDriver,
  completeTask,
  confirmAppointment,
  createQuote,
  createTask,
  logCommunication,
  recordCustomerCall,
  selectCarrier,
  setLoadOwnership,
} from "../../packages/db/operations";
import { validCandidate } from "../unit/shipment.test";

const enabled = Boolean(process.env.DATABASE_URL);
const db = new PrismaClient();

describe.skipIf(!enabled)("persistent four-employee staging workflow", () => {
  let organizationId = "";
  let slug = "";
  let creatorId = "";
  let approverId = "";
  let operatorId = "";
  let outsiderId = "";
  let otherSlug = "";
  let requestId = "";
  let loadId = "";

  beforeAll(async () => {
    slug = `atlas-test-${randomUUID()}`;
    otherSlug = `other-test-${randomUUID()}`;
    const organization = await db.organization.create({
      data: { slug, name: "Atlas Test" },
    });
    const other = await db.organization.create({
      data: { slug: otherSlug, name: "Other Test" },
    });
    organizationId = organization.id;
    const users = await Promise.all(
      ["Creator", "Approver", "Operator", "Outsider"].map((name) =>
        db.user.create({
          data: {
            name,
            email: `${name.toLowerCase()}-${randomUUID()}@test.invalid`,
          },
        }),
      ),
    );
    [creatorId, approverId, operatorId, outsiderId] = users.map(
      (user) => user.id,
    );
    await db.organizationMembership.createMany({
      data: [
        { organizationId, userId: creatorId, role: "APPROVER" },
        { organizationId, userId: approverId, role: "APPROVER" },
        { organizationId, userId: operatorId, role: "OPERATOR" },
        { organizationId: other.id, userId: outsiderId, role: "APPROVER" },
      ],
    });
    const request = await createShipmentRequest(creatorId, {
      organizationSlug: slug,
      originalText: "Synthetic persistent workflow",
      structured: validCandidate,
    });
    requestId = request.requestId;
    loadId = await approveRevision(
      creatorId,
      slug,
      request.revisionId,
      randomUUID(),
    );
  });

  afterAll(() => db.$disconnect());

  it("persists calls, quote approval and customer acceptance with separation of duties", async () => {
    await recordCustomerCall(operatorId, slug, {
      shipmentRequestId: requestId,
      customerName: "Synthetic Customer",
      contactName: "Synthetic Contact",
      notes: "Requested a dry van quote",
      occurredAt: new Date(),
    });
    const quoteId = await createQuote(creatorId, slug, {
      shipmentRequestId: requestId,
      amountCents: "250000",
      assumptions: "Synthetic staging assumptions",
    });
    await expect(
      approveQuote(creatorId, slug, quoteId, randomUUID()),
    ).rejects.toThrow("SEPARATION_OF_DUTIES");
    expect(await approveQuote(approverId, slug, quoteId, "quote-approve")).toBe(
      quoteId,
    );
    expect(await approveQuote(approverId, slug, quoteId, "quote-approve")).toBe(
      quoteId,
    );
    await acceptQuote(
      creatorId,
      slug,
      { quoteId, evidence: "Customer accepted during a synthetic phone call" },
      randomUUID(),
    );
    expect(
      (await db.quote.findUniqueOrThrow({ where: { id: quoteId } })).status,
    ).toBe("ACCEPTED");
  });

  it("blocks an unqualified carrier and selects only a qualified carrier", async () => {
    const blockedId = await addCarrierCandidate(operatorId, slug, {
      loadId,
      carrierName: "Blocked Synthetic Carrier",
      authorityConfirmed: false,
      insuranceConfirmed: false,
      cargoCoverageCents: "0",
    });
    await expect(
      selectCarrier(approverId, slug, blockedId, randomUUID()),
    ).rejects.toThrow("CARRIER_BLOCKED");
    const qualifiedId = await addCarrierCandidate(operatorId, slug, {
      loadId,
      carrierName: "Qualified Synthetic Carrier",
      authorityConfirmed: true,
      insuranceConfirmed: true,
      cargoCoverageCents: "10000000",
      quotedCostCents: "180000",
    });
    await selectCarrier(approverId, slug, qualifiedId, "select-qualified");
    await assignDriver(operatorId, slug, {
      loadId,
      carrierCandidateId: qualifiedId,
      driverName: "Synthetic Driver",
      driverPhone: "555-0100",
      dispatcherName: "Synthetic Dispatcher",
      dispatcherPhone: "555-0101",
      tractorNumber: "TR-TEST",
      trailerNumber: "TL-TEST",
    });
    expect(
      (
        await db.carrierCandidate.findUniqueOrThrow({
          where: { id: blockedId },
        })
      ).status,
    ).toBe("BLOCKED");
    expect(
      (
        await db.carrierCandidate.findUniqueOrThrow({
          where: { id: qualifiedId },
        })
      ).status,
    ).toBe("SELECTED");
  });

  it("persists appointments, ownership, tracking, communications, tasks and audits", async () => {
    const stops = await db.loadStop.findMany({ where: { loadId } });
    for (const stop of stops)
      await confirmAppointment(operatorId, slug, stop.id);
    await setLoadOwnership(operatorId, slug, {
      loadId,
      primaryOwnerId: operatorId,
      nextAction: "Confirm synthetic pickup",
    });
    await addTrackingUpdate(operatorId, slug, {
      loadId,
      status: "MANUAL_CHECK_CALL",
      location: "Synthetic City, TN",
      occurredAt: new Date(),
      notes: "No GPS provider connected",
    });
    await logCommunication(operatorId, slug, {
      loadId,
      channel: "PHONE",
      partyType: "DRIVER",
      partyName: "Synthetic Driver",
      direction: "OUTBOUND",
      summary: "Confirmed synthetic ETA",
      occurredAt: new Date(),
    });
    const taskId = await createTask(operatorId, slug, {
      loadId,
      title: "Review synthetic pickup evidence",
      assigneeId: operatorId,
      dueAt: new Date(Date.now() + 60_000),
    });
    await completeTask(operatorId, slug, taskId);
    const load = await db.load.findUniqueOrThrow({
      where: { id: loadId },
      include: {
        stops: true,
        trackingUpdates: true,
        communications: true,
        tasks: true,
      },
    });
    expect(load.primaryOwnerId).toBe(operatorId);
    expect(load.stops.every((stop) => stop.appointmentConfirmedAt)).toBe(true);
    expect(load.trackingUpdates).toHaveLength(1);
    expect(load.communications).toHaveLength(1);
    expect(load.tasks[0].status).toBe("COMPLETED");
    expect(
      await db.auditEvent.count({ where: { organizationId } }),
    ).toBeGreaterThanOrEqual(20);
  });

  it("denies cross-organization reads and mutations", async () => {
    await expect(
      setLoadOwnership(outsiderId, otherSlug, {
        loadId,
        primaryOwnerId: outsiderId,
        nextAction: "Cross tenant mutation",
      }),
    ).rejects.toThrow();
    expect(
      await db.load.count({
        where: { organizationId: { not: organizationId }, id: loadId },
      }),
    ).toBe(0);
  });
});
