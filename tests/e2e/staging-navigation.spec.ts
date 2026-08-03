import { expect, test } from "@playwright/test";

test.skip(
  process.env.ATLAS_DEMO_MODE === "true",
  "Persistent staging-mode workspace coverage.",
);

test("authenticated staging shell exposes Ready Operations owner workflows", async ({
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
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".app-shell > .sidebar .demo-label")).toHaveText(
    "STAGING · POSTGRESQL",
  );
  const routes = [
    ["/org/atlas-north", "Today"],
    ["/org/atlas-north/quotes", "Quotes"],
    ["/org/atlas-north/loads", "Loads"],
    ["/org/atlas-north/companies", "Companies"],
    ["/org/atlas-north/money", "Money"],
    ["/org/atlas-north/settings", "Settings"],
  ] as const;
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".app-shell > .sidebar .demo-label")).toHaveText(
      "STAGING · POSTGRESQL",
    );
  }
  await expect(page.getByText("READY OPERATIONS").first()).toBeVisible();
  await expect(page.getByText("Google", { exact: false })).toHaveCount(0);

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
