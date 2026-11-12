import { defineConfig, devices } from "@playwright/test";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to a separate database ending in _test.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/demo",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: url,
      AUTH_URL: "http://127.0.0.1:3100",
      AUTH_SECRET: "local-test-only-secret-not-a-production-credential-123456789",
      AUTH_GOOGLE_ID: "test-client-not-real",
      AUTH_GOOGLE_SECRET: "test-secret-not-real",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4.1-mini",
    },
  },
});
