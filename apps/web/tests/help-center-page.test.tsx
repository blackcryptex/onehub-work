import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HELP_ARTICLES, HELP_ROLES } from "../src/lib/help-content";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/layout/LandingHeader", () => ({ LandingHeader: () => <header>OneHub</header> }));
vi.mock("lucide-react", () => ({ BookOpen: () => null, Search: () => null, MessageCircle: () => null, Users: () => null }));

describe("Help Center page", () => {
  it("renders real role and article links without placeholder loops", async () => {
    const { default: HelpPage } = await import("../src/app/help/page");

    const html = renderToStaticMarkup(<HelpPage />);

    expect(html).toContain("Help Center");
    expect(html).not.toMatch(/TODO: Create|coming soon|placeholder|Video Tutorials|API Documentation/i);
    expect(html).not.toContain('href="/help" class="text-slate-600');
    for (const role of HELP_ROLES) {
      expect(html).toContain(`/help/roles/${role}`);
    }
    for (const article of HELP_ARTICLES) {
      expect(html).toContain(`/help/articles/${article.slug}`);
    }
  });
});
