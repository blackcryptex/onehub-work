import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const src = (...parts: string[]) => readFileSync(resolve(here, "../src", ...parts), "utf8");

const guardedLegalLinks = [
  "/legal/payments",
  "/legal/refunds",
  "/legal/disputes",
  "/legal/fees",
  "/legal/booking-classification",
];

describe("Gate 7 draft trust/legal/support UX anchors", () => {
  it("keeps signup legal helper as a disabled internal-draft non-acceptance placeholder", () => {
    const signup = src("app/(auth)/signup/page.tsx");

    expect(signup).toContain("NOT LEGAL-APPROVED / INTERNAL DRAFT");
    expect(signup).toContain("Draft non-acceptance placeholder");
    expect(signup).toContain("disabled");
    expect(signup).toContain("/terms");
    expect(signup).toContain("/privacy");
    expect(signup).toContain("/support");
  });

  it("places policy/support draft anchors near provider onboarding payment and publish steps", () => {
    const onboarding = src("app/providers/onboarding/page.tsx");

    expect(onboarding).toContain("Step 4: Payments & Contracts");
    expect(onboarding).toContain("Provider-entered payment, cancellation, and reschedule language is a draft input only");
    expect(onboarding).toContain("Step 7: Review & Publish");
    expect(onboarding).toContain("Draft publish reminder only");
    for (const href of ["/terms", "/legal/payments", "/legal/refunds", "/legal/disputes", "/support"]) {
      expect(onboarding).toContain(`href=\"${href}\"`);
    }
  });

  it("exposes public and guarded draft policy links in header and footer without hiding draft posture", () => {
    const header = src("components/layout/LandingHeader.tsx");
    const footer = src("components/layout/Footer.tsx");

    for (const href of ["/terms", "/privacy", "/support", ...guardedLegalLinks]) {
      expect(header).toContain(`href=\"${href}\"`);
      expect(footer).toContain(`href: \"${href}\"`);
    }
    expect(header).toContain("Draft Payment Policies");
    expect(footer).toContain("Draft Legal");
  });

  it("labels support/help unavailable channels as coming soon instead of self-loop actions", () => {
    const support = src("app/support/page.tsx");
    const help = src("app/help/page.tsx");

    expect(support).toContain("not operationally verified for launch");
    expect(support).toContain("Coming soon");
    expect(support).not.toContain("href=\"/support\" className=\"text-indigo-600 font-medium hover:underline\">Start Chat");
    expect(help).toContain("draft article coming soon");
    expect(help).toContain("Docs coming soon");
    expect(help).toContain("/legal/payments");
    expect(help).toContain("/legal/refunds");
    expect(help).toContain("/legal/disputes");
  });

  it("adds internal-draft/effective-version placeholders to all public legal policy pages", () => {
    for (const path of [
      "app/terms/page.tsx",
      "app/privacy/page.tsx",
      "app/legal/payments/page.tsx",
      "app/legal/refunds/page.tsx",
      "app/legal/disputes/page.tsx",
      "app/legal/fees/page.tsx",
      "app/legal/booking-classification/page.tsx",
    ]) {
      const page = src(path);
      expect(page).toContain("DraftLegalPageNotice");
      expect(page).toMatch(/versionLabel=\"[^\"]+draft-v0\"|versionLabel=\"[^\"]+internal-draft-v0\"/);
    }
  });
});
