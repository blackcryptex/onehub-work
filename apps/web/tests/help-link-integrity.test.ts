import { describe, expect, it } from "vitest";
import { HELP_ARTICLES, HELP_ROLES, getHelpArticlesByRole, isHelpArticleSlug, isHelpRole, helpArticleHref, helpRoleHref } from "../src/lib/help-content";

describe("help link integrity", () => {
  it("builds article and role hrefs that resolve against static content", () => {
    for (const article of HELP_ARTICLES) {
      expect(helpArticleHref(article.slug)).toBe(`/help/articles/${article.slug}`);
      expect(isHelpArticleSlug(article.slug)).toBe(true);
      for (const relatedSlug of article.relatedSlugs) {
        expect(isHelpArticleSlug(relatedSlug), `${article.slug} -> ${relatedSlug}`).toBe(true);
      }
    }

    for (const role of HELP_ROLES) {
      expect(helpRoleHref(role)).toBe(`/help/roles/${role}`);
      expect(isHelpRole(role)).toBe(true);
      expect(getHelpArticlesByRole(role).length, role).toBeGreaterThan(0);
    }
  });

  it("does not expose dead hrefs in help content helpers", () => {
    const hrefs = [
      ...HELP_ARTICLES.flatMap((article) => [helpArticleHref(article.slug), ...article.relatedSlugs.map(helpArticleHref)]),
      ...HELP_ROLES.map(helpRoleHref),
    ];

    expect(hrefs).not.toContain("#");
    expect(hrefs).not.toContain("/help/videos");
    expect(hrefs).not.toContain("/help/api");
    expect(hrefs).not.toContain("/help/docs");
    expect(hrefs.every((href) => href.startsWith("/help/articles/") || href.startsWith("/help/roles/"))).toBe(true);
  });
});
