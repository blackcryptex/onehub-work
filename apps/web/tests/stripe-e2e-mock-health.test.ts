import { afterEach, describe, expect, it, vi } from "vitest";

describe("E2E mock Stripe health surface", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("supports balance.retrieve so local mocked payment smoke can pass health checks", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ONEHUB_E2E_TEST_MODE", "1");
    vi.stubEnv("ONEHUB_E2E_MOCK_STRIPE", "1");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unused_when_mocked");

    vi.resetModules();
    const { stripe } = await import("../src/server/lib/stripe");

    await expect(stripe?.balance.retrieve()).resolves.toMatchObject({
      object: "balance",
      available: expect.any(Array),
      pending: expect.any(Array),
    });
  });
});
