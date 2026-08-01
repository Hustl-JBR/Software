import { beforeEach, describe, expect, it } from "vitest";
import {
  approveDemoRevision,
  correctDemoShipment,
  createDemoShipment,
  DEMO_ORGANIZATION,
  getDemoLoad,
  getDemoRequest,
  getDemoRequests,
  resetDemoStateForTests,
} from "../../apps/web/lib/demo-store";

const requestText =
  "Move 18 pallets of packaged furniture from Nashville, Tennessee to Atlanta, Georgia. Pickup is August 5, 2026 and delivery is August 6, 2026. The shipment weighs 28,000 pounds and needs a dry van.";

describe("browser-only demo store", () => {
  beforeEach(resetDemoStateForTests);

  it("extracts deterministic facts and reports fields it will not guess", () => {
    const created = createDemoShipment({
      organizationSlug: DEMO_ORGANIZATION.slug,
      originalText: requestText,
      structured: {},
    });
    const request = getDemoRequest(created.requestId)!;
    const revision = request.revisions[0];

    expect(revision.structuredData).toMatchObject({
      customerName: "Atlas Demo Shipper",
      originCity: "Nashville",
      originState: "TN",
      destinationCity: "Atlanta",
      destinationState: "GA",
      commodity: "Packaged furniture",
      weightPounds: 28000,
      equipmentType: "DRY_VAN",
      pickupDate: "2026-08-05",
      deliveryDate: "2026-08-06",
      palletCount: 18,
    });
    expect(revision.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "originFacilityName",
        "originPostalCode",
        "destinationFacilityName",
        "destinationPostalCode",
      ]),
    );
  });

  it("creates one load and two stops when approval is retried", () => {
    const created = createDemoShipment({
      organizationSlug: DEMO_ORGANIZATION.slug,
      originalText: requestText,
      structured: {},
    });
    const revisionId = correctDemoShipment(
      DEMO_ORGANIZATION.slug,
      created.requestId,
      {
        customerName: "Atlas Demo Shipper",
        originFacilityName: "Atlas Nashville Warehouse",
        originCity: "Nashville",
        originState: "TN",
        originPostalCode: "37210",
        destinationFacilityName: "Atlas Atlanta Distribution Center",
        destinationCity: "Atlanta",
        destinationState: "GA",
        destinationPostalCode: "30336",
        commodity: "Packaged furniture",
        weightPounds: "28000",
        equipmentType: "DRY_VAN",
        pickupDate: "2026-08-05",
        deliveryDate: "2026-08-06",
        palletCount: "18",
        hazmat: false,
      },
    );

    const firstLoadId = approveDemoRevision(DEMO_ORGANIZATION.slug, revisionId);
    const retryLoadId = approveDemoRevision(DEMO_ORGANIZATION.slug, revisionId);

    expect(retryLoadId).toBe(firstLoadId);
    expect(getDemoRequests()).toHaveLength(1);
    expect(getDemoLoad(firstLoadId)?.stops).toHaveLength(2);
  });
});
