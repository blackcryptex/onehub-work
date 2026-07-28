import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isLocalBaseURL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseURL);
const vercelProtectionBypassSecret =
  process.env.PLAYWRIGHT_VERCEL_BYPASS_SECRET ?? process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders = vercelProtectionBypassSecret
  ? { "x-vercel-protection-bypass": vercelProtectionBypassSecret }
  : undefined;
const e2eDatabaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:***@127.0.0.1:54329/onehub_e2e?schema=public";

const webServer: PlaywrightTestConfig["webServer"] = isLocalBaseURL
  ? {
      command: `cd apps/web && NEXTAUTH_URL=${baseURL} AUTH_URL=${baseURL} NEXT_PUBLIC_APP_URL=${baseURL} pnpm dev`,
      url: baseURL,
      timeout: 120_000,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1" || !process.env.CI,
      env: {
        DATABASE_URL: e2eDatabaseUrl,
        NEXTAUTH_URL: baseURL,
        NEXTAUTH_SECRET: "onehub-slice-5-e2e-secret-do-not-use-in-production",
        AUTH_SECRET: "onehub-slice-5-e2e-secret-do-not-use-in-production",
        STRIPE_SECRET_KEY: "«redacted:sk_test_…»",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_onehub_slice5_mocked_only",
        ONEHUB_E2E_TEST_MODE: "1",
        ONEHUB_E2E_MOCK_STRIPE: "1",
        GUARDED_MVP_PLATFORM_ADMIN_USER_IDS: "slice5-e2e-admin",
      },
    }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  },
  ...(webServer ? { webServer } : {}),
  projects: [
    {
      name: "setup",
      testMatch: /.*auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: [/.*auth\.setup\.ts/, /.*selected-event-vault\.spec\.ts/],
    },
    {
      name: "authenticated",
      testMatch: /.*selected-event-vault\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
});
