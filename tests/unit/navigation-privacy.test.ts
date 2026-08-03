import { describe, expect, it } from "vitest";
import {
  demoNavigation,
  workspaceNavigation,
  navigationIsActive,
} from "../../apps/web/lib/demo-navigation";
import {
  maskPhone,
  mayRevealDriverContact,
} from "../../apps/web/lib/demo-privacy";
describe("demo navigation", () => {
  it("defines every sidebar route", () => {
    const items = [...demoNavigation, ...workspaceNavigation];
    expect(items.map((item) => item.label)).toEqual([
      "Today",
      "Quotes",
      "Loads",
      "Companies",
      "Money",
    ]);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });
  it("matches active routes", () => {
    expect(
      navigationIsActive("/org/atlas-north", "/org/atlas-north", true),
    ).toBe(true);
    expect(
      navigationIsActive(
        "/org/atlas-north/loads/atl-4821",
        "/org/atlas-north/loads",
      ),
    ).toBe(true);
    expect(
      navigationIsActive("/org/atlas-north/tracking", "/org/atlas-north/loads"),
    ).toBe(false);
  });
});
describe("driver contact privacy", () => {
  it("masks by default", () =>
    expect(maskPhone("615-555-0187")).toBe("•••-•••-0187"));
  it("restricts reveal", () => {
    expect(mayRevealDriverContact("APPROVER")).toBe(true);
    expect(mayRevealDriverContact("OPERATOR")).toBe(true);
    expect(mayRevealDriverContact("VIEWER")).toBe(false);
  });
});
