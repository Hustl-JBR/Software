import { expect, test } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE !== "true",
  "This suite verifies the isolated browser-only demo.",
);

const routes = [
  ["Command center", "/org/atlas-north", "Good morning, Jordan."],
  ["Loads", "/org/atlas-north/loads", "Loads"],
  ["Tracking", "/org/atlas-north/tracking", "Global tracking"],
  ["Network", "/org/atlas-north/network", "Network"],
  ["Analytics", "/org/atlas-north/analytics", "Analytics"],
  ["Documents", "/org/atlas-north/documents", "Documents"],
  ["Settings", "/org/atlas-north/settings", "Settings"],
] as const;

test.describe("demo workspace navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/org/atlas-north");
    await expect(page.locator(".app-shell > .sidebar .demo-label")).toHaveText(
      "DEMO",
    );
  });

  for (const [label, path, heading] of routes) {
    test(`${label} renders from the sidebar and a direct URL`, async ({
      page,
    }) => {
      const sidebar = page.locator(".sidebar");
      await sidebar.getByRole("link", { name: label, exact: false }).click();
      await expect(page).toHaveURL(
        new RegExp(`${path.replaceAll("/", "\\/")}$`),
      );
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(
        sidebar.getByRole("link", { name: label, exact: false }),
      ).toHaveClass(/active/);

      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    });
  }

  test("browser history and invalid-route recovery are controlled", async ({
    page,
  }) => {
    const sidebar = page.locator(".sidebar");
    await sidebar.getByRole("link", { name: "Loads", exact: false }).click();
    await expect(page).toHaveURL(/\/org\/atlas-north\/loads$/);
    await sidebar.getByRole("link", { name: "Tracking", exact: false }).click();
    await expect(page).toHaveURL(/\/org\/atlas-north\/tracking$/);
    await page.waitForTimeout(250);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/org\/atlas-north\/loads$/);
    await expect(page.getByRole("heading", { name: "Loads" })).toBeVisible({
      timeout: 15_000,
    });
    await page.goForward({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Global tracking" }),
    ).toBeVisible();

    await page.goto("/org/atlas-north/not-a-real-workspace");
    await expect(
      page.getByRole("heading", { name: "That record is unavailable." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to command center" }),
    ).toBeVisible();
  });
});

test("driver contact is masked, can be revealed, and logs an event", async ({
  page,
}) => {
  await page.goto("/org/atlas-north/loads/atl-4821");
  await page.getByRole("button", { name: "Contacts" }).click();
  const driverRow = page.locator(".contact-row", { hasText: "Luis Martinez" });
  await expect(driverRow.getByText("•••-•••-0187")).toBeVisible();
  await driverRow.getByRole("button", { name: "Reveal" }).click();
  await expect(driverRow.getByText("615-555-0187")).toBeVisible();
  await driverRow.getByRole("button", { name: "Log call" }).click();
  await page.getByRole("button", { name: "Communications" }).click();
  await expect(page.getByText("Call logged · Luis Martinez")).toBeVisible();
});

test("workspace routes emit no browser errors or warnings", async ({
  page,
}) => {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      messages.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

  for (const [, path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  expect(messages).toEqual([]);
});

test("tracking interruption becomes shared command-center attention", async ({
  page,
}) => {
  await page.goto("/org/atlas-north/loads/atl-4821");
  await page.getByRole("button", { name: "Tracking" }).click();
  await page.getByRole("button", { name: "Pause updates" }).click();
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Command center", exact: false })
    .click();
  await expect(page.getByText("Driver tracking was interrupted")).toBeVisible();
});

test("carrier sourcing blocks unresolved insurance and cargo coverage", async ({
  page,
}) => {
  await page.goto("/org/atlas-north/loads/atl-4827");
  await page.getByRole("button", { name: "Sourcing" }).click();
  const blockedCarrier = page.locator(".carrier-compare-row", {
    hasText: "Oak River Freight",
  });
  await expect(
    blockedCarrier.getByRole("button", { name: "Blocked" }),
  ).toBeDisabled();
  await expect(
    page
      .locator(".carrier-compare-row", { hasText: "Summit Freight" })
      .getByRole("button", { name: "Select" }),
  ).toBeEnabled();
});
