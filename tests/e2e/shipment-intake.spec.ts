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
    page.getByRole("heading", { name: "Review shipment request" }),
  ).toBeVisible();
  await expect(
    page.getByText("MISSING", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("UNCERTAIN", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Customer or shipper name")).toHaveValue(
    "E2E Foods",
  );

  await page.getByLabel("Origin facility name").fill("E2E Chicago Plant");
  await page.getByLabel("Origin city").fill("Chicago");
  await page.getByLabel("Origin state").fill("IL");
  await page.getByLabel("Origin postal code").fill("60601");
  await page.getByLabel("Destination facility name").fill("E2E Dallas DC");
  await page.getByLabel("Destination city").fill("Dallas");
  await page.getByLabel("Destination state").fill("TX");
  await page.getByLabel("Destination postal code").fill("75201");
  await page.getByRole("button", { name: "Save as new revision" }).click();

  await expect(
    page.getByText("A new immutable correction revision was saved."),
  ).toBeVisible();
  await expect(
    page.getByText("This revision passes deterministic validation."),
  ).toBeVisible();
  await page.getByLabel("I reviewed and approve this exact revision.").check();
  await page
    .getByRole("button", { name: "Approve and create draft load" })
    .click();

  await expect(page.getByText("Persistent load operations")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stops · 2" })).toBeVisible();
  await expect(page.getByText("E2E Chicago Plant")).toBeVisible();
  await expect(page.getByText("E2E Dallas DC")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Audit ·/ })).toBeVisible();
  await expect(page.getByText("DRAFT_LOAD_CREATED")).toBeVisible();
  await expect(page.getByText("LOAD_STOPS_CREATED")).toBeVisible();
});
