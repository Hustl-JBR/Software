import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  approveRevision,
  correctShipmentRequest,
  createShipmentRequest,
} from "../../packages/db/commands";
import { validCandidate } from "../unit/shipment.test";

const enabled = Boolean(process.env.DATABASE_URL);
const db = new PrismaClient();
describe.skipIf(!enabled)("approval transaction with PostgreSQL", () => {
  let orgId = "",
    otherOrgId = "",
    approverId = "",
    operatorId = "",
    slug = "",
    otherSlug = "";
  beforeEach(async () => {
    slug = `org-${randomUUID()}`;
    otherSlug = `org-${randomUUID()}`;
    const org = await db.organization.create({
      data: { slug, name: "Test Org" },
    });
    const other = await db.organization.create({
      data: { slug: otherSlug, name: "Other Org" },
    });
    orgId = org.id;
    otherOrgId = other.id;
    const approver = await db.user.create({
      data: { email: `a-${randomUUID()}@test.local`, name: "Approver" },
    });
    const operator = await db.user.create({
      data: { email: `o-${randomUUID()}@test.local`, name: "Operator" },
    });
    approverId = approver.id;
    operatorId = operator.id;
    await db.organizationMembership.createMany({
      data: [
        { organizationId: orgId, userId: approverId, role: "APPROVER" },
        { organizationId: orgId, userId: operatorId, role: "OPERATOR" },
      ],
    });
  });
  afterAll(() => db.$disconnect());
  async function revision(candidate: unknown = validCandidate) {
    const created = await createShipmentRequest(approverId, {
      organizationSlug: slug,
      originalText: "synthetic",
      structured: candidate,
    });
    return created.revisionId;
  }
  it("creates one draft load, two stops, status history, approval and audits", async () => {
    const revisionId = await revision();
    const loadId = await approveRevision(approverId, slug, revisionId, "key-1");
    const load = await db.load.findUniqueOrThrow({
      where: { id: loadId },
      include: { stops: true, statusHistory: true },
    });
    expect(load.status).toBe("DRAFT");
    expect(load.stops).toHaveLength(2);
    expect(load.statusHistory).toHaveLength(1);
    expect(
      await db.auditEvent.count({ where: { organizationId: orgId } }),
    ).toBe(8);
  });
  it("returns the same load on idempotent retry and blocks another key", async () => {
    const revisionId = await revision();
    const first = await approveRevision(approverId, slug, revisionId, "same");
    expect(await approveRevision(approverId, slug, revisionId, "same")).toBe(
      first,
    );
    await expect(
      approveRevision(approverId, slug, revisionId, "different"),
    ).rejects.toThrow();
    expect(await db.load.count({ where: { organizationId: orgId } })).toBe(1);
  });
  it("allows only one concurrent approval", async () => {
    const revisionId = await revision();
    const outcomes = await Promise.allSettled([
      approveRevision(approverId, slug, revisionId, "a"),
      approveRevision(approverId, slug, revisionId, "b"),
    ]);
    expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.load.count({ where: { organizationId: orgId } })).toBe(1);
  });
  it("rejects unauthorized, invalid, stale and cross-tenant approval", async () => {
    const bad = await revision({ equipmentType: "DRY_VAN" });
    await expect(approveRevision(approverId, slug, bad, "bad")).rejects.toThrow(
      "INVALID_REVISION",
    );
    await expect(
      approveRevision(operatorId, slug, bad, "operator"),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      approveRevision(approverId, otherSlug, bad, "cross"),
    ).rejects.toThrow();
    const good = await revision();
    await correctShipmentRequest(
      approverId,
      slug,
      (
        await db.shipmentRequestRevision.findUniqueOrThrow({
          where: { id: good },
        })
      ).shipmentRequestId,
      validCandidate,
    );
    await expect(
      approveRevision(approverId, slug, good, "stale"),
    ).rejects.toThrow("STALE_REVISION");
    expect(otherOrgId).not.toBe(orgId);
  });
  it("rolls back all approval writes when approval validation fails", async () => {
    const request = await db.shipmentRequest.create({
      data: { organizationId: orgId },
    });
    const invalidRevision = await db.shipmentRequestRevision.create({
      data: {
        organizationId: orgId,
        shipmentRequestId: request.id,
        revisionNumber: 1,
        originalText: "synthetic invalid persisted revision",
        structuredData: { ...validCandidate, originState: "BAD" },
        extractionMetadata: { provider: "test", schemaVersion: "1" },
        validationResults: { issues: ["invalid origin state"] },
        createdById: approverId,
      },
    });
    await expect(
      approveRevision(approverId, slug, invalidRevision.id, "rollback"),
    ).rejects.toThrow();
    expect(await db.load.count({ where: { organizationId: orgId } })).toBe(0);
    expect(
      await db.approvalRequest.count({ where: { organizationId: orgId } }),
    ).toBe(0);
    expect(
      await db.idempotencyRecord.count({
        where: { organizationId: orgId, key: "rollback" },
      }),
    ).toBe(0);
  });
  it("enforces revision and audit immutability in PostgreSQL", async () => {
    const revisionId = await revision();
    await expect(
      db.shipmentRequestRevision.update({
        where: { id: revisionId },
        data: { originalText: "mutated" },
      }),
    ).rejects.toThrow();
    await expect(
      db.shipmentRequestRevision.delete({ where: { id: revisionId } }),
    ).rejects.toThrow();
    const event = await db.auditEvent.findFirstOrThrow();
    await expect(
      db.auditEvent.update({
        where: { id: event.id },
        data: { action: "MUTATED" },
      }),
    ).rejects.toThrow();
    await expect(
      db.auditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
  });

  it("creates all expected tables and immutable load status history", async () => {
    const tables = await db.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    expect(tables.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "organizations",
        "users",
        "organization_memberships",
        "customers",
        "shipment_requests",
        "shipment_request_revisions",
        "shipment_issues",
        "approval_requests",
        "loads",
        "load_stops",
        "load_status_history",
        "audit_events",
        "idempotency_records",
      ]),
    );
    const revisionId = await revision();
    const loadId = await approveRevision(
      approverId,
      slug,
      revisionId,
      "history",
    );
    const history = await db.loadStatusHistory.findFirstOrThrow({
      where: { loadId },
    });
    await expect(
      db.loadStatusHistory.update({
        where: { id: history.id },
        data: { reason: "MUTATED" },
      }),
    ).rejects.toThrow();
    await expect(
      db.loadStatusHistory.delete({ where: { id: history.id } }),
    ).rejects.toThrow();
  });
});
