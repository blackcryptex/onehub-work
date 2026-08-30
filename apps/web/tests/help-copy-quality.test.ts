import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, type HelpArticle } from "../src/lib/help-content";

const genericSlugs = new Set([
  "source-vendors-and-venues",
  "send-booking-request",
  "review-proposal",
  "review-contract",
  "sign-contract",
  "understand-payment-readiness",
  "create-tasks-and-milestones",
  "handle-crisis-and-replacement",
]);

function articleText(article: HelpArticle) {
  return [
    article.title,
    article.summary,
    ...article.beforeYouStart,
    ...article.steps,
    ...article.successLooksLike,
    ...article.commonMistakes,
    ...(article.safetyNotes ?? []),
  ].join("\n");
}

describe("help copy quality guardrails", () => {
  it("bans filler and unavailable help claims", () => {
    for (const article of HELP_ARTICLES) {
      expect(articleText(article), article.slug).not.toMatch(/coming soon|TODO|lorem ipsum|placeholder|video tutorial|API documentation/i);
    }
  });

  it("does not force wedding terminology in generic event guides", () => {
    for (const article of HELP_ARTICLES.filter((item) => genericSlugs.has(item.slug))) {
      expect(articleText(article), article.slug).not.toMatch(/bride|groom|wedding party|wedding-only|your wedding/i);
    }
  });

  it("keeps payment, contract, and admin copy inside guarded private-pilot language", () => {
    const allText = HELP_ARTICLES.map(articleText).join("\n");

    expect(allText).not.toMatch(/legally binding|legal advice|live payments are enabled|escrow enabled|guaranteed payout|automatic refund/i);
    expect(allText).toMatch(/private-pilot|test-mode|guarded/i);
    expect(allText).toMatch(/manual review/i);
  });

  it("requires success criteria and mistakes for every article", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.successLooksLike.length, article.slug).toBeGreaterThan(0);
      expect(article.commonMistakes.length, article.slug).toBeGreaterThan(0);
    }
  });
});
