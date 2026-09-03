import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  outputDir: "test-results/playwright",
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  reporter: process.env.CI ? "github" : "line",
  retries: process.env.CI ? 1 : 0,
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173/mh-calculator",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-static-e2e.cjs",
    reuseExistingServer: false,
    timeout: 30_000,
    url: "http://127.0.0.1:4173/mh-calculator/",
  },
});
