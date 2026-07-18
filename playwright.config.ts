import { defineConfig } from "@playwright/test";

const e2eDatabaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54329/onehub_e2e?schema=public";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
  webServer: {
    command: "cd apps/web && pnpm dev",
    url: "http://127.0.0.1:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_SECRET: "onehub-slice-5-e2e-secret-do-not-use-in-production",
      AUTH_SECRET: "onehub-slice-5-e2e-secret-do-not-use-in-production",
      STRIPE_SECRET_KEY: "sk_test_onehub_slice5_mocked_only",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_onehub_slice5_mocked_only",
      ONEHUB_E2E_TEST_MODE: "1",
      ONEHUB_E2E_MOCK_STRIPE: "1",
      GUARDED_MVP_PLATFORM_ADMIN_USER_IDS: "slice5-e2e-admin",
    },
  },
});
