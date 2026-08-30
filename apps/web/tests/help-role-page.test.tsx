import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HELP_ROLES } from "../src/lib/help-content";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const notFound = vi.fn(() => {
  throw new Error("not-found");
});

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/layout/LandingHeader", () => ({ LandingHeader: () => <header>OneHub</header> }));

describe("help role page", () => {
  it("renders a guide collection for every supported role", async () => {
    const { default: HelpRolePage } = await import("../src/app/help/roles/[role]/page");

    for (const role of HELP_ROLES) {
      const html = renderToStaticMarkup(await HelpRolePage({ params: Promise.resolve({ role }) }));
      expect(html).toContain("guide collection");
      expect(html).toContain(`/help/roles/${role}`);
      expect(html).toContain("/help/articles/");
      expect(html).not.toMatch(/coming soon|TODO|placeholder/i);
    }
  });

  it("404s unknown roles", async () => {
    const { default: HelpRolePage } = await import("../src/app/help/roles/[role]/page");

    await expect(HelpRolePage({ params: Promise.resolve({ role: "guest" }) })).rejects.toThrow("not-found");
  });
});
