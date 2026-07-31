import { describe, expect, it } from "vitest";
import { DeterministicMockExtractionAdapter } from "../../packages/integrations/extraction";
describe("deterministic extraction adapter", () => {
  const adapter = new DeterministicMockExtractionAdapter();
  it("extracts stable labeled facts and preserves source references", async () => {
    const result = await adapter.extract({
      originalText:
        "Customer: Acme; pickup: 2026-08-10; delivery: 2026-08-12; commodity: cans; weight: 38,000 lbs",
      structured: {},
    });
    expect(result.candidates).toMatchObject({
      customerName: "Acme",
      pickupDate: "2026-08-10",
      weightPounds: 38000,
      equipmentType: "DRY_VAN",
    });
    expect(result.sourceReferences.customerName).toContain("Customer:");
  });
  it("does not guess and reports missing values", async () => {
    const result = await adapter.extract({
      originalText: "Please move this load",
      structured: {},
    });
    expect(result.candidates.originCity).toBeUndefined();
    expect(
      result.issues.some(
        (x) => x.type === "MISSING" && x.field === "originCity",
      ),
    ).toBe(true);
  });
  it("reports uncertainty and conflicting pickup dates", async () => {
    const result = await adapter.extract({
      originalText: "Maybe pickup: 2026-08-10; pickup: 2026-08-11",
      structured: {},
    });
    expect(result.issues.some((x) => x.type === "UNCERTAIN")).toBe(true);
    expect(result.issues.some((x) => x.type === "CONFLICTING")).toBe(true);
  });
});
