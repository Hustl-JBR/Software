import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const port = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `node apps/web/node_modules/next/dist/bin/next dev apps/web --hostname 127.0.0.1 --port ${port}`,
        url: `${baseURL}/${process.env.ATLAS_DEMO_MODE === "true" ? "org/atlas-north" : "sign-in"}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
