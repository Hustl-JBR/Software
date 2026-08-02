import { expect, test } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE === "true",
  "Persistent staging-mode workspace coverage.",
);

test("authenticated staging shell exposes real workspace routes and honest inactive states", async ({
  page,
}) => {
  const password = process.env.ATLAS_DEVELOPMENT_SEED_PASSWORD;
  if (!password) throw new Error("Missing ATLAS_DEVELOPMENT_SEED_PASSWORD");
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("approver@atlas.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await page.waitForURL("**/org/atlas-north");
  await expect(
    page.getByRole("heading", { name: "Good morning, Avery." }),
  ).toBeVisible();
  await expect(page.locator(".demo-label:visible")).toHaveText(
    "STAGING · POSTGRESQL",
  );
  const routes = [
    ["/operations", "Operations"],
    ["/org/atlas-north", "Good morning, Avery."],
    ["/org/atlas-north/loads", "Loads"],
    ["/org/atlas-north/tracking", "Global tracking"],
    ["/org/atlas-north/network", "Network"],
    ["/org/atlas-north/analytics", "Analytics"],
    ["/org/atlas-north/documents", "Documents"],
    ["/org/atlas-north/settings", "Settings"],
  ] as const;
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".demo-label:visible")).toHaveText(
      "STAGING · POSTGRESQL",
    );
  }
  await page.goto("/org/atlas-north/documents");
  await expect(page.getByText("Document storage is not active")).toBeVisible();
  await page.goto("/org/atlas-north/tracking");
  await expect(page.getByText("GPS provider not connected")).toBeVisible();

  await expect(
    page.locator(".sidebar").getByRole("link", { name: /staging tools/i }),
  ).toHaveCount(0);
  await page.goto("/internal/staging-tools");
  await expect(
    page.getByRole("heading", { name: "That record is unavailable." }),
  ).toBeVisible();
});

test("malformed staging record identifiers fail as controlled not-found pages", async ({
  page,
}) => {
  const password = process.env.ATLAS_DEVELOPMENT_SEED_PASSWORD;
  if (!password) throw new Error("Missing ATLAS_DEVELOPMENT_SEED_PASSWORD");
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("approver@atlas.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue securely" }).click();
  await page.waitForURL("**/org/atlas-north");

  for (const path of [
    "/org/atlas-north/loads/not-a-uuid",
    "/org/atlas-north/requests/not-a-uuid",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "That record is unavailable." }),
    ).toBeVisible();
  }
});
