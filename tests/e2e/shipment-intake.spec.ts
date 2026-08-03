import { expect, test } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE === "true",
  "The persistent workflow requires PostgreSQL authentication.",
);

test("create customer, price and accept a quote, then open the uncovered load", async ({
  page,
}) => {
  const password = process.env.ATLAS_DEVELOPMENT_SEED_PASSWORD;
  if (!password) throw new Error("Missing ATLAS_DEVELOPMENT_SEED_PASSWORD");
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("approver@atlas.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();

  const suffix = Date.now();
  const customerName = `Ready E2E Customer ${suffix}`;
  await page.goto("/org/atlas-north/companies?type=customers");
  await page.getByText("Add customer", { exact: true }).click();
  await page.locator('input[name="name"]').fill(customerName);
  await page.locator('input[name="contactName"]').fill("Ready Reviewer");
  await page
    .locator('input[name="contactEmail"]')
    .fill(`review-${suffix}@example.invalid`);
  await page.locator('input[name="paymentTerms"]').fill("Net 30");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText(customerName, { exact: true })).toBeVisible();

  await page.goto("/org/atlas-north/quotes");
  const quoteDetails = page.locator("details", {
    hasText: "New quote request",
  });
  if (!(await quoteDetails.locator('select[name="customerId"]').isVisible()))
    await quoteDetails.locator("summary").click();
  await quoteDetails
    .locator('select[name="customerId"]')
    .selectOption({ label: customerName });
  await quoteDetails
    .locator('input[name="pickupAddressLine1"]')
    .fill("100 Ready Way");
  await quoteDetails.locator('input[name="pickupCity"]').fill("Atlanta");
  await quoteDetails.locator('input[name="pickupState"]').fill("GA");
  await quoteDetails.locator('input[name="pickupPostalCode"]').fill("30303");
  await quoteDetails
    .locator('input[name="deliveryAddressLine1"]')
    .fill("200 Freight Ave");
  await quoteDetails.locator('input[name="deliveryCity"]').fill("Charlotte");
  await quoteDetails.locator('input[name="deliveryState"]').fill("NC");
  await quoteDetails.locator('input[name="deliveryPostalCode"]').fill("28202");
  await quoteDetails.locator('input[name="pickupDate"]').fill("2026-08-10");
  await quoteDetails.locator('input[name="deliveryDate"]').fill("2026-08-12");
  await quoteDetails
    .locator('select[name="equipmentType"]')
    .selectOption("DRY_VAN");
  await quoteDetails.locator('input[name="commodity"]').fill("Canned goods");
  await quoteDetails.locator('input[name="weightPounds"]').fill("38000");
  await quoteDetails.locator('input[name="customerPrice"]').fill("2850.00");
  await quoteDetails
    .locator('input[name="estimatedCarrierCost"]')
    .fill("2200.00");
  await quoteDetails
    .getByRole("button", { name: "Create draft quote" })
    .click();
  await expect(page.getByRole("heading", { name: /RFQ-/ })).toBeVisible();
  await page.getByRole("button", { name: "Mark sent" }).click();
  await page
    .getByLabel("Acceptance evidence")
    .fill("Customer acceptance email received");
  await page.getByRole("button", { name: "Accept and create load" }).click();
  await expect(page.getByRole("heading", { name: /RF-/ })).toBeVisible();
  await expect(
    page.getByText("UNCOVERED", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator(".ready-tabs")).toContainText("Overview");
  await expect(page.locator(".ready-tabs")).toContainText("Activity");
});
