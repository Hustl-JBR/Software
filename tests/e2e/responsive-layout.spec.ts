import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE === "true",
  "Responsive evidence must use authenticated PostgreSQL staging mode.",
);

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 1000 },
  { width: 1280, height: 960 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
] as const;

async function assertNoPageOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    htmlClient: document.documentElement.clientWidth,
    htmlScroll: document.documentElement.scrollWidth,
    bodyClient: document.body.clientWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect(dimensions.htmlScroll, `${label}: html overflow`).toBeLessThanOrEqual(
    dimensions.htmlClient,
  );
  expect(dimensions.bodyScroll, `${label}: body overflow`).toBeLessThanOrEqual(
    dimensions.bodyClient,
  );
}

test("all major staging routes remain usable across the approved viewport matrix", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const password = process.env.ATLAS_DEVELOPMENT_SEED_PASSWORD;
  if (!password) throw new Error("Missing ATLAS_DEVELOPMENT_SEED_PASSWORD");

  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) =>
    browserErrors.push(`pageerror: ${error.message}`),
  );

  await page.setViewportSize(viewports[0]);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("approver@atlas.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await page.waitForURL("**/org/atlas-north");

  await page.goto("/org/atlas-north/requests/new");
  await page
    .getByLabel("Plain-English shipment request")
    .fill(
      "Customer: Responsive Evidence Foods; pickup: 2026-08-10; delivery: 2026-08-12; commodity: canned goods; weight: 38,000 lbs",
    );
  await page.getByRole("button", { name: "Analyze shipment" }).click();
  await expect(
    page.getByRole("heading", { name: "Review shipment details" }),
  ).toBeVisible();
  const reviewHref = new URL(page.url()).pathname;
  await page
    .locator('input[name="originFacilityName"]')
    .fill("Responsive Chicago Plant");
  await page.locator('input[name="originCity"]').fill("Chicago");
  await page.locator('input[name="originState"]').fill("IL");
  await page.locator('input[name="originPostalCode"]').fill("60601");
  await page
    .locator('input[name="destinationFacilityName"]')
    .fill("Responsive Dallas DC");
  await page.locator('input[name="destinationCity"]').fill("Dallas");
  await page.locator('input[name="destinationState"]').fill("TX");
  await page.locator('input[name="destinationPostalCode"]').fill("75201");
  await page.locator('select[name="equipmentType"]').selectOption("DRY_VAN");
  await page.getByRole("button", { name: "Save as new revision" }).click();
  await expect(page.getByText("Revision 2 saved")).toBeVisible();
  await page.getByLabel(/I reviewed this exact revision/).check();
  await page
    .getByRole("button", { name: /Approve & create draft load/ })
    .click();
  await expect(page.getByText("Load operations")).toBeVisible();
  const loadHref = new URL(page.url()).pathname;

  const routes = [
    { name: "operations", path: "/operations" },
    { name: "command-center", path: "/org/atlas-north" },
    { name: "loads", path: "/org/atlas-north/loads" },
    { name: "new-shipment", path: "/org/atlas-north/requests/new" },
    { name: "shipment-review", path: reviewHref },
    { name: "load-overview", path: `${loadHref}#overview` },
    { name: "load-pricing", path: `${loadHref}#pricing` },
    { name: "load-sourcing", path: `${loadHref}#sourcing` },
    { name: "load-carrier", path: `${loadHref}#carrier` },
    { name: "load-stops", path: `${loadHref}#stops` },
    { name: "load-tracking", path: `${loadHref}#tracking` },
    { name: "load-communications", path: `${loadHref}#communications` },
    { name: "load-tasks", path: `${loadHref}#tasks` },
    { name: "load-timeline", path: `${loadHref}#timeline` },
    { name: "load-audit", path: `${loadHref}#audit` },
  ];
  const capture = process.env.ATLAS_CAPTURE_SCREENSHOTS === "true";
  const evidenceRoot = join(
    process.cwd(),
    "test-results",
    "authenticated-staging",
  );
  const manifest: Array<Record<string, string | number | boolean>> = [];
  if (capture) await mkdir(evidenceRoot, { recursive: true });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator("main")).toBeVisible();
      await assertNoPageOverflow(page, `${viewport.width}/${route.name}`);

      if (viewport.width <= 1024) {
        await expect(page.locator(".app-shell > .sidebar")).toBeHidden();
        await expect(page.locator(".mobile-header")).toBeVisible();
        await expect(page.locator(".mobile-header .demo-label")).toHaveText(
          "STAGING · POSTGRESQL",
        );
      } else {
        await expect(page.locator(".app-shell > .sidebar")).toBeVisible();
        await expect(page.locator(".mobile-header")).toBeHidden();
        await expect(
          page.locator(".app-shell > .sidebar .demo-label"),
        ).toHaveText("STAGING · POSTGRESQL");
      }

      if (capture) {
        const directory = join(evidenceRoot, String(viewport.width));
        await mkdir(directory, { recursive: true });
        const fileName = `${route.name}.png`;
        await page.screenshot({ path: join(directory, fileName) });
        manifest.push({
          viewport: viewport.width,
          route: route.name,
          path: route.path,
          file: `${viewport.width}/${fileName}`,
          authenticated: true,
          environment: "STAGING · POSTGRESQL",
        });
      }
    }

    if (viewport.width <= 1024) {
      await page.goto("/org/atlas-north");
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator(".mobile-drawer.open")).toBeVisible();
      await assertNoPageOverflow(page, `${viewport.width}/drawer-open`);
      await page
        .locator(".mobile-drawer")
        .getByRole("button", { name: "Close navigation" })
        .click();
      await expect(page.locator(".mobile-drawer.open")).toHaveCount(0);
    }
  }

  await page.goto("/operations");
  await expect(page.getByRole("link", { name: /New shipment/ })).toBeVisible();
  await page.goto(loadHref);
  await expect(page.locator(".operations-tabs")).toBeVisible();
  await assertNoPageOverflow(page, "load-tabs");
  expect(browserErrors).toEqual([]);

  if (capture) {
    await writeFile(
      join(evidenceRoot, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  }
});
