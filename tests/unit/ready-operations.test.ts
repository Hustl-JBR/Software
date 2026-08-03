import { describe, expect, it } from "vitest";
import { simplePdf } from "../../apps/web/lib/simple-pdf";
import { atlasNavigation } from "../../apps/web/lib/demo-navigation";

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
});
