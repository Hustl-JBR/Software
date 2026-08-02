import { expect, test } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE === "true",
  "The persistent intake flow requires PostgreSQL authentication.",
);

test("sign in, review extraction, correct, approve, and view a draft load", async ({
  page,
}) => {
  const password = process.env.ATLAS_DEVELOPMENT_SEED_PASSWORD;
  if (!password) throw new Error("Missing ATLAS_DEVELOPMENT_SEED_PASSWORD");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("approver@atlas.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(
    page.getByRole("heading", { name: "Good morning, Avery." }),
  ).toBeVisible();

  await page.getByRole("link", { name: /New shipment/ }).click();
  await page
    .getByLabel("Plain-English shipment request")
    .fill(
      "Customer: E2E Foods; pickup: 2026-08-10; delivery: 2026-08-12; commodity: canned goods; weight: 38,000 lbs; maybe confirm destination",
    );
  await page.getByRole("button", { name: "Analyze shipment" }).click();

  await expect(
    page.getByRole("heading", { name: "Review shipment details" }),
  ).toBeVisible();
  await expect(page.getByText(/confidence/i)).toHaveCount(0);
  await expect(page.getByText(/capacity used/i)).toHaveCount(0);
  await expect(page.getByText("Estimated transit")).toBeVisible();
  await expect(page.getByText("Not calculated")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Information needed" }),
  ).toBeVisible();
  await expect(page.getByText("Complete missing fields")).toBeVisible();
  await expect(page.locator('input[name="customerName"]')).toHaveValue(
    "E2E Foods",
  );

  await page
    .locator('input[name="originFacilityName"]')
    .fill("E2E Chicago Plant");
  await page.locator('input[name="originCity"]').fill("Chicago");
  await page.locator('input[name="originState"]').fill("IL");
  await page.locator('input[name="originPostalCode"]').fill("60601");
  await page
    .locator('input[name="destinationFacilityName"]')
    .fill("E2E Dallas DC");
  await page.locator('input[name="destinationCity"]').fill("Dallas");
  await page.locator('input[name="destinationState"]').fill("TX");
  await page.locator('input[name="destinationPostalCode"]').fill("75201");
  await page.getByRole("button", { name: "Save as new revision" }).click();

  await expect(page.getByText("Revision 2 saved")).toBeVisible();
  await expect(page.getByText("Deterministic validation passed")).toBeVisible();
  await page.getByLabel(/I reviewed this exact revision/).check();
  await page
    .getByRole("button", { name: /Approve & create draft load/ })
    .click();

  await expect(page.getByText("Load operations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stops · 2" })).toBeVisible();
  await expect(page.getByText("E2E Chicago Plant")).toBeVisible();
  await expect(page.getByText("E2E Dallas DC")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Audit ·/ })).toBeVisible();
  await expect(page.getByText("DRAFT_LOAD_CREATED")).toBeVisible();
  await expect(page.getByText("STOPS_CREATED", { exact: true })).toBeVisible();
});
