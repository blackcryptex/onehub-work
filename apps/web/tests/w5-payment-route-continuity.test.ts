import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.cwd();
const read = (path: string) => readFileSync(join(repo, path), "utf8");

describe("W5 payment route continuity", () => {
  it("locks the legacy proposal funding route instead of showing fake Stripe or amount copy", () => {
    const source = read("apps/web/src/app/(app)/proposals/[id]/fund/page.tsx");

    expect(source).toContain("getCurrentUser");
    expect(source).toContain("canViewCommercialProposal");
    expect(source).toContain("redirect(contractDetail(proposal.contract.id) as Route)");
    expect(source).toContain("This legacy funding route no longer shows amounts or a placeholder Stripe form");
    expect(source).not.toContain("Stripe Elements payment form would be embedded here");
    expect(source).not.toContain("Amount to fund");
  });

  it("provides a clear payments alias for the existing event payment plan route", () => {
    const source = read("apps/web/src/app/(app)/events/[eventSlug]/payments/page.tsx");

    expect(source).toContain("../milestones/page");
  });

  it("keeps payment plan copy guarded and distinguishes planning rows from executed release evidence", () => {
    const source = read("apps/web/src/components/payments/PaymentPlanPageClient.tsx");

    expect(source).toContain("Payment planning / held-funds review");
    expect(source).toContain("Planning rows are not provider-paid evidence");
    expect(source).toContain("Transfer evidence recorded");
    expect(source).not.toContain("Stripe Connect held funds pending release coming next");
  });
});
