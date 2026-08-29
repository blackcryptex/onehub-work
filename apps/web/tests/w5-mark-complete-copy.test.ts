import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "apps/web/src/app/api/payments/mark-milestone-complete/route.ts"), "utf8");

describe("W5 mark-complete guarded copy", () => {
  it("does not claim provider completion makes payment releasable", () => {
    expect(source).toContain("Provider completion evidence submitted for admin review");
    expect(source).toContain("release remains blocked until refund, dispute, holdback, payout setup, Stripe, escrow, transfer, and guarded-admin checks pass");
    expect(source).not.toContain("Payment can now be released");
  });
});
