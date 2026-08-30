import { describe, expect, it } from "vitest";
import {
  HELP_ARTICLES,
  HELP_ROLES,
  getAllHelpArticles,
  getHelpArticle,
  getHelpArticlesByCategory,
  getHelpArticlesByRole,
  type HelpArticle,
} from "../src/lib/help-content";

const requiredSlugs = [
  "pro-planner-send-message",
  "diy-create-event",
  "pro-planner-create-event",
  "source-vendors-and-venues",
  "send-booking-request",
  "review-proposal",
  "accept-proposal",
  "review-contract",
  "sign-contract",
  "understand-payment-readiness",
  "create-tasks-and-milestones",
  "handle-crisis-and-replacement",
  "admin-review-risk",
];

function articleText(article: HelpArticle) {
  return [
    article.title,
    article.summary,
    article.category,
    ...article.beforeYouStart,
    ...article.steps,
    ...article.successLooksLike,
    ...article.commonMistakes,
    ...(article.safetyNotes ?? []),
  ].join("\n");
}

describe("help content model", () => {
  it("ships the approved private-pilot help article set with unique slugs", () => {
    const slugs = HELP_ARTICLES.map((article) => article.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(expect.arrayContaining(requiredSlugs));
    expect(getAllHelpArticles()).toHaveLength(HELP_ARTICLES.length);
  });

  it("resolves articles by slug, role, and category", () => {
    expect(getHelpArticle("pro-planner-send-message")?.title).toMatch(/send a message/i);
    expect(getHelpArticlesByRole("pro-planner").map((article) => article.slug)).toContain("pro-planner-send-message");
    expect(getHelpArticlesByRole("diy-planner").map((article) => article.slug)).toContain("diy-create-event");
    expect(getHelpArticlesByCategory("Contracts and proposals").map((article) => article.slug)).toEqual(
      expect.arrayContaining(["review-proposal", "review-contract"]),
    );
    expect(getHelpArticle("missing-guide")).toBeNull();
  });

  it("keeps role collections populated", () => {
    for (const role of HELP_ROLES) {
      expect(getHelpArticlesByRole(role).length, role).toBeGreaterThan(0);
    }
  });

  it("keeps every related article link resolvable", () => {
    const slugs = new Set(HELP_ARTICLES.map((article) => article.slug));

    for (const article of HELP_ARTICLES) {
      for (const relatedSlug of article.relatedSlugs) {
        expect(slugs.has(relatedSlug), `${article.slug} -> ${relatedSlug}`).toBe(true);
      }
    }
  });

  it("keeps articles complete, specific, and non-placeholder", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.steps.length, article.slug).toBeGreaterThanOrEqual(3);
      expect(article.beforeYouStart.length, article.slug).toBeGreaterThan(0);
      expect(article.successLooksLike.length, article.slug).toBeGreaterThan(0);
      expect(article.commonMistakes.length, article.slug).toBeGreaterThan(0);
      expect(articleText(article)).not.toMatch(/coming soon|TODO|lorem ipsum|placeholder|stub|fake/i);
    }
  });
});
