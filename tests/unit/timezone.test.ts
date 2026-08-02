import { describe, expect, it } from "vitest";
import {
  formatInFacilityTimeZone,
  isIanaTimeZone,
  localDateTimeToInstant,
} from "../../packages/domain/timezone";

describe("facility-local appointment conversion", () => {
  it("converts a normal local appointment to the correct instant", () => {
    const result = localDateTimeToInstant(
      "2026-08-05T08:00",
      "America/Chicago",
    );
    expect(result.instant.toISOString()).toBe("2026-08-05T13:00:00.000Z");
    expect(formatInFacilityTimeZone(result.instant, result.timeZone)).toContain(
      "8:00 AM",
    );
  });

  it("rejects a nonexistent spring-forward wall time", () => {
    expect(() =>
      localDateTimeToInstant("2026-03-08T02:30", "America/New_York"),
    ).toThrow("NONEXISTENT_LOCAL_TIME");
  });

  it("requires explicit disambiguation for a fall-back overlap", () => {
    expect(() =>
      localDateTimeToInstant("2026-11-01T01:30", "America/New_York"),
    ).toThrow("AMBIGUOUS_LOCAL_TIME");
    expect(
      localDateTimeToInstant(
        "2026-11-01T01:30",
        "America/New_York",
        "EARLIER",
      ).instant.toISOString(),
    ).toBe("2026-11-01T05:30:00.000Z");
    expect(
      localDateTimeToInstant(
        "2026-11-01T01:30",
        "America/New_York",
        "LATER",
      ).instant.toISOString(),
    ).toBe("2026-11-01T06:30:00.000Z");
  });

  it("rejects unknown or offset-only time zone labels", () => {
    expect(isIanaTimeZone("EST")).toBe(false);
    expect(isIanaTimeZone("America/Denver")).toBe(true);
  });
});
