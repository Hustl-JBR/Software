import { describe, expect, it } from "vitest";
import { simplePdf } from "../../apps/web/lib/simple-pdf";
import { atlasNavigation } from "../../apps/web/lib/demo-navigation";
import {
  completeReadyAddress,
  parseStoredReadyAddress,
  readyAddressError,
  readyAddressIssues,
  validateReadyAddress,
} from "../../apps/web/lib/ready-address";

describe("Ready Operations visible workflow", () => {
  it("keeps primary navigation to the five owner workflows", () => {
    expect(atlasNavigation("ready").primary.map((item) => item.label)).toEqual([
      "Today",
      "Quotes",
      "Loads",
      "Companies",
      "Money",
    ]);
  });

  it("produces downloadable PDF documents without an external service", () => {
    const pdf = simplePdf("READY FREIGHT", [
      "Quote RFQ-00001",
      "Total: $2,500.00",
    ]);
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString("ascii")).toContain("READY FREIGHT");
    expect(pdf.toString("ascii")).toContain("%%EOF");
  });

  it("reproduces the live incomplete pickup and identifies every missing field", () => {
    const pickup = validateReadyAddress(
      "pickup",
      parseStoredReadyAddress("1771 Claybrook Park Circle"),
    );

    expect(readyAddressIssues([pickup])).toEqual([
      "Pickup city is missing.",
      "Pickup state is missing.",
      "Pickup ZIP is missing.",
    ]);
    expect(readyAddressError([pickup])).toBe(
      "Complete the pickup city, state, and ZIP before creating the load.",
    );
    expect(completeReadyAddress(pickup)).toBeNull();
  });

  it.each([
    [
      "pickup state",
      "pickup",
      "100 Ready Way, Atlanta, 30303",
      "Pickup state is missing.",
    ],
    [
      "delivery state",
      "delivery",
      "200 Freight Ave, Charlotte, 28202",
      "Delivery state is missing.",
    ],
    [
      "pickup city",
      "pickup",
      "100 Ready Way, , GA 30303",
      "Pickup city is missing.",
    ],
    [
      "delivery ZIP",
      "delivery",
      "200 Freight Ave, Charlotte, NC",
      "Delivery ZIP is missing.",
    ],
  ] as const)("blocks a missing %s", (_name, kind, stored, issue) => {
    const validation = validateReadyAddress(
      kind,
      parseStoredReadyAddress(stored),
    );

    expect(readyAddressIssues([validation])).toContain(issue);
    expect(completeReadyAddress(validation)).toBeNull();
  });

  it("accepts complete US pickup and delivery addresses", () => {
    const pickup = validateReadyAddress(
      "pickup",
      parseStoredReadyAddress("100 Ready Way, Atlanta, GA 30303"),
    );
    const delivery = validateReadyAddress(
      "delivery",
      parseStoredReadyAddress("200 Freight Ave, Charlotte, NC 28202"),
    );

    expect(readyAddressError([pickup, delivery])).toBeNull();
    expect(completeReadyAddress(pickup)).toEqual({
      addressLine1: "100 Ready Way",
      city: "Atlanta",
      state: "GA",
      postalCode: "30303",
    });
    expect(completeReadyAddress(delivery)).not.toBeNull();
  });
});
