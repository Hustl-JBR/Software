import { describe, expect, it } from "vitest";
import {
  formatUsdFromCents,
  parseUsdToCents,
} from "../../apps/web/lib/currency";
import { safeErrorCode, safeReturnPath } from "../../apps/web/lib/safe-error";

describe("USD input", () => {
  it.each([
    ["$2,850.00", 285000n],
    ["2,180", 218000n],
    ["100000.5", 10000050n],
    ["0", 0n],
    ["  $42.07  ", 4207n],
  ])("parses %s as integer cents", (input, expected) => {
    expect(parseUsdToCents(input)).toBe(expected);
  });

  it.each(["", "-1", "$1.001", "1,00", "abc", "99999999999999"])(
    "rejects invalid input %s",
    (input) => expect(() => parseUsdToCents(input)).toThrow("INVALID_MONEY"),
  );

  it("formats integer cents as employee-facing dollars", () => {
    expect(formatUsdFromCents(285000n)).toBe("$2,850.00");
    expect(formatUsdFromCents(10000000n)).toBe("$100,000.00");
    expect(formatUsdFromCents(undefined)).toBe("Not recorded");
  });
});

describe("safe operator errors", () => {
  it("maps known domain failures and hides raw database text", () => {
    expect(safeErrorCode(new Error("FORBIDDEN"))).toBe("unauthorized");
    expect(safeErrorCode(new Error("Prisma P2003 constraint foo"))).toBe(
      "database",
    );
  });

  it("accepts only controlled return locations", () => {
    expect(safeReturnPath("atlas-staging", "/internal/staging-tools")).toBe(
      "/internal/staging-tools",
    );
    expect(
      safeReturnPath(
        "atlas-staging",
        "/org/atlas-staging/loads/934fdcf6-c085-4df5-98b6-99b88fadfdc8",
      ),
    ).toContain("/org/atlas-staging/loads/");
    expect(safeReturnPath("atlas-staging", "https://evil.invalid")).toBe(
      "/operations",
    );
  });
});
