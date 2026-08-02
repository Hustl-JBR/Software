import { describe, expect, it } from "vitest";
import {
  compatibilityRole,
  effectiveRoles,
} from "../../packages/auth/membership";

describe("membership role authority", () => {
  it("uses explicit rows instead of retaining removed legacy privileges", () => {
    expect(effectiveRoles("APPROVER", ["VIEWER"])).toEqual(["VIEWER"]);
  });

  it("falls back to the legacy role only for unmigrated memberships", () => {
    expect(effectiveRoles("OPERATOR", [])).toEqual(["OPERATOR"]);
  });

  it("keeps the compatibility column synchronized to an assigned role", () => {
    expect(compatibilityRole(["VIEWER", "OPERATOR"])).toBe("VIEWER");
  });
});
