import { describe, expect, it } from "vitest";
import {
  shipmentCandidateSchema,
  validateCandidate,
} from "../../packages/domain/shipment";

export const validCandidate = {
  customerName: "Acme Foods",
  originFacilityName: "Acme Plant",
  originCity: "Chicago",
  originState: "IL",
  originPostalCode: "60601",
  destinationFacilityName: "Dallas DC",
  destinationCity: "Dallas",
  destinationState: "TX",
  destinationPostalCode: "75201",
  pickupDate: "2026-08-10",
  deliveryDate: "2026-08-12",
  commodity: "Canned goods",
  weightPounds: 38000,
  equipmentType: "DRY_VAN",
  hazmat: false,
};

describe("shipment candidate schema", () => {
  it("accepts a complete domestic dry-van request", () =>
    expect(shipmentCandidateSchema.parse(validCandidate)).toMatchObject(
      validCandidate,
    ));
  it("reports missing required fields", () => {
    const result = validateCandidate({ equipmentType: "DRY_VAN" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.issues.map((x) => x.field)).toContain("customerName");
  });
  it("rejects delivery before pickup", () =>
    expect(
      shipmentCandidateSchema.safeParse({
        ...validCandidate,
        deliveryDate: "2026-08-01",
      }).success,
    ).toBe(false));
  it("rejects incomplete and reversed appointment windows", () => {
    expect(
      shipmentCandidateSchema.safeParse({
        ...validCandidate,
        pickupAppointmentStart: "2026-08-10T12:00:00.000Z",
      }).success,
    ).toBe(false);
    expect(
      shipmentCandidateSchema.safeParse({
        ...validCandidate,
        pickupAppointmentStart: "2026-08-10T14:00:00.000Z",
        pickupAppointmentEnd: "2026-08-10T12:00:00.000Z",
      }).success,
    ).toBe(false);
  });
  it("rejects unsupported equipment", () =>
    expect(
      shipmentCandidateSchema.safeParse({
        ...validCandidate,
        equipmentType: "REEFER",
      }).success,
    ).toBe(false));
  it("requires declared value to be integer cents", () =>
    expect(
      shipmentCandidateSchema.safeParse({
        ...validCandidate,
        declaredValueCents: 1200.5,
      }).success,
    ).toBe(false));
});
