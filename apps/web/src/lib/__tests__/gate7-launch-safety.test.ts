import { afterEach, describe, expect, it, vi } from "vitest";

import { trackError, trackMessage } from "../errorTracker";
import { GET as healthGet } from "../../app/api/health/route";

vi.mock("../health", () => ({
  performHealthChecks: vi.fn(async () => ({
    status: "ok",
    timestamp: "2026-06-04T00:00:00.000Z",
    checks: {
      database: "ok",
      stripe: "ok",
    },
  })),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Gate 7 safe launch pre-work", () => {
  it("returns public health status without dependency details or secrets", async () => {
    const response = await healthGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      timestamp: "2026-06-04T00:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("database");
    expect(JSON.stringify(body)).not.toContain("stripe");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("redacts sensitive error text and context before console fallback logging", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    trackError(new Error("failed with token sk_test_1234567890"), {
      route: "/api/payments/confirm",
      authorization: "Bearer private-token",
      password: "plain-text-password",
      nested: {
        stripeWebhookSecret: "whsec_private",
        safe: "visible",
      },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0]!;
    expect(payload).toMatchObject({
      error: "failed with token [REDACTED]",
      route: "/api/payments/confirm",
      authorization: "[REDACTED]",
      password: "[REDACTED]",
      nested: {
        stripeWebhookSecret: "[REDACTED]",
        safe: "visible",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("sk_test_1234567890");
    expect(JSON.stringify(payload)).not.toContain("plain-text-password");
    expect(JSON.stringify(payload)).not.toContain("whsec_private");
  });

  it("redacts sensitive message context for provider-neutral message tracking", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    trackMessage("webhook retry for pi_123", "warning", {
      apiKey: "sk_live_should_not_log",
      userId: "user_123",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0]!;
    expect(payload).toMatchObject({
      message: "webhook retry for pi_123",
      level: "warning",
      apiKey: "[REDACTED]",
      userId: "user_123",
    });
    expect(JSON.stringify(payload)).not.toContain("sk_live_should_not_log");
  });
});
