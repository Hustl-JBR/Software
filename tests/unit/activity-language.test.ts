import { describe, expect, it } from "vitest";
import {
  humanizeAuditActivity,
  humanizeCode,
} from "../../apps/web/lib/activity-language";

describe("employee-facing activity language", () => {
  it("translates technical audit actions into operational sentences", () => {
    expect(
      humanizeAuditActivity({
        action: "CARRIER_SELECTED",
        actorName: "Avery",
        subject: "ATL-1001",
      }),
    ).toBe("Avery selected the carrier for ATL-1001.");
  });

  it("uses a safe generic sentence for unknown technical actions", () => {
    expect(
      humanizeAuditActivity({
        action: "FUTURE_EVENT",
        subject: "ATL-1001",
      }),
    ).toBe("A team member updated ATL-1001.");
  });

  it("humanizes enum and camel-case codes", () => {
    expect(humanizeCode("MANUAL_CHECK_CALL")).toBe("Manual check call");
    expect(humanizeCode("ShipmentRequest")).toBe("Shipment request");
  });
});
