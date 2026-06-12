import { describe, expect, it } from "vitest";

import { isManualAdminOnlyWebhook, redactAdminMetadata } from "../src/lib/admin-oversight";
import { dashboard } from "../src/lib/routes";

describe("Gate 6B admin oversight foundation", () => {
  it("routes admins to the canonical admin dashboard without the stale /app prefix", () => {
    expect(dashboard("ADMIN")).toBe("/admin/overview");
  });

  it("redacts unsafe provider and secret metadata before audit display", () => {
    expect(
      redactAdminMetadata({
        safe: "visible",
        stripePayload: { id: "evt_123", secret: "hidden" },
        nested: { authorization: "Bearer token", reason: "manual review" },
      })
    ).toEqual({
      safe: "visible",
      stripePayload: "[REDACTED]",
      nested: { authorization: "[REDACTED]", reason: "manual review" },
    });
  });

  it("identifies manual-admin-only webhook handoff metadata", () => {
    expect(isManualAdminOnlyWebhook({ manualAdminOnly: true })).toBe(true);
    expect(isManualAdminOnlyWebhook({ kind: "manual-admin-only" })).toBe(true);
    expect(isManualAdminOnlyWebhook({ kind: "automatic" })).toBe(false);
  });
});
