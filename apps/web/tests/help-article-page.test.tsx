import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const notFound = vi.fn(() => {
  throw new Error("not-found");
});

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/layout/LandingHeader", () => ({ LandingHeader: () => <header>OneHub</header> }));

describe("help article page", () => {
  it("renders a known article with required sections and related links", async () => {
    const { default: HelpArticlePage } = await import("../src/app/help/articles/[slug]/page");

    const html = renderToStaticMarkup(await HelpArticlePage({ params: Promise.resolve({ slug: "pro-planner-send-message" }) }));

    expect(html).toContain("Send a message as a pro planner");
    expect(html).toContain("Who this is for");
    expect(html).toContain("Before you start");
    expect(html).toContain("Exact steps");
    expect(html).toContain("What success looks like");
    expect(html).toContain("Common mistakes");
    expect(html).toContain("Safety notes");
    expect(html).toContain("/help/articles/understand-payment-readiness");
  });

  it("404s unknown article slugs", async () => {
    const { default: HelpArticlePage } = await import("../src/app/help/articles/[slug]/page");

    await expect(HelpArticlePage({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow("not-found");
  });
});
