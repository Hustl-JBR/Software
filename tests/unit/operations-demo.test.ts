import { describe, expect, it } from "vitest";
import { initialOperationsDemoState } from "../../apps/web/lib/operations-demo-data";

describe("operations demo data", () => {
  it("provides a connected 12-load operating portfolio", () => {
    expect(initialOperationsDemoState.loads).toHaveLength(12);
    const statuses = new Set(
      initialOperationsDemoState.loads.map((load) => load.status),
    );
    for (const expected of [
      "Awaiting review",
      "Ready to quote",
      "Sourcing carrier",
      "In transit",
      "Delayed",
      "Delivered",
      "Documents pending",
      "Ready to invoice",
    ])
      expect(statuses.has(expected)).toBe(true);
    for (const item of initialOperationsDemoState.attention)
      expect(
        initialOperationsDemoState.loads.some(
          (load) => load.id === item.loadId,
        ),
      ).toBe(true);
    for (const exception of initialOperationsDemoState.exceptions)
      expect(
        initialOperationsDemoState.loads.some(
          (load) => load.id === exception.loadId,
        ),
      ).toBe(true);
  });

  it("keeps pricing, sourcing, and financial values synthetic but internally coherent", () => {
    const quoted = initialOperationsDemoState.loads.find(
      (load) => load.id === "atl-4821",
    )!;
    expect(quoted.revenue - quoted.carrierCost).toBe(880);
    expect(
      initialOperationsDemoState.pricing.every(
        (price) => price.customerQuote > price.marketCost,
      ),
    ).toBe(true);
    expect(initialOperationsDemoState.carriers).toHaveLength(4);
    expect(
      initialOperationsDemoState.carriers.every(
        (carrier) => carrier.mc.includes("XX") && carrier.dot.includes("XX"),
      ),
    ).toBe(true);
  });
});
