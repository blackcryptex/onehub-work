import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "apps/web/src/server/routers/billing.ts"), "utf8");

describe("W5 billing router guardrails", () => {
  it("disables the legacy proposal/client-amount payment intent path", () => {
    const start = source.indexOf("escrowCreatePaymentIntent");
    const end = source.indexOf("escrowReleaseMilestone", start);
    const legacyCreateIntentMutation = source.slice(start, end);

    expect(legacyCreateIntentMutation).toContain("Legacy proposal payment intent creation via billing router is disabled");
    expect(legacyCreateIntentMutation).toContain("canonical /api/payments/create-intent route");
    expect(legacyCreateIntentMutation).not.toContain("stripe.paymentIntents.create");
    expect(legacyCreateIntentMutation).not.toContain("amount: input.amountCents");
    expect(legacyCreateIntentMutation).not.toContain("data: { stripeIntent: intent.id }");
  });
});
