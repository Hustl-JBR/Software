import { describe, expect, it } from "vitest";
import { carrierSelectionBlockReason } from "../../apps/web/lib/carrier-compliance";

const qualified = {
  authority: "Active",
  insuranceStatus: "Verified",
  insuranceExpires: "2026-12-18",
  cargoLimit: 100_000,
};

describe("demo carrier selection boundaries", () => {
  it("allows a qualified carrier within verified cargo coverage", () => {
    expect(
      carrierSelectionBlockReason(qualified, 75_000, "2026-07-31"),
    ).toBeNull();
  });

  it("blocks expired insurance", () => {
    expect(
      carrierSelectionBlockReason(
        { ...qualified, insuranceExpires: "2026-07-30" },
        75_000,
        "2026-07-31",
      ),
    ).toBe("Insurance is expired");
  });

  it("blocks insufficient cargo coverage", () => {
    expect(
      carrierSelectionBlockReason(
        { ...qualified, cargoLimit: 50_000 },
        75_000,
        "2026-07-31",
      ),
    ).toBe("Cargo value exceeds verified coverage");
  });

  it("blocks inactive authority and do-not-use carriers", () => {
    expect(
      carrierSelectionBlockReason(
        { ...qualified, authority: "Inactive" },
        75_000,
        "2026-07-31",
      ),
    ).toBe("Operating authority is inactive");
    expect(
      carrierSelectionBlockReason(
        { ...qualified, doNotUse: true },
        75_000,
        "2026-07-31",
      ),
    ).toBe("Carrier is marked do not use");
  });
});
