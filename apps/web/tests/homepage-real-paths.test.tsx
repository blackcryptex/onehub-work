import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/layout/LandingHeader", () => ({
  LandingHeader: () => <header>OneHub</header>,
}));

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
  };
});

vi.mock("@/components/vendor-venue/VendorVenueLink", () => ({
  VendorVenueLink: () => <a href="/providers/start">Get Featured</a>,
}));

describe("homepage path cards", () => {
  it("does not render a dead Coming Soon card and exposes only real user paths", async () => {
    const { default: Page } = await import("../src/app/page");

    const html = renderToStaticMarkup(<Page />);

    expect(html).not.toMatch(/coming soon|exciting new features on the way/i);
    expect(html).toContain("DIY Planner");
    expect(html).toContain('/events/new');
    expect(html).toContain("Professional Planner");
    expect(html).toContain('/professional-planner/setup');
    expect(html).toContain("Vendor/Venue");
    expect(html).toContain('/providers/start');
    expect(html).toContain("Event Dreamer");
    expect(html).toContain('/event-dreamer/create');
    expect(html).toContain("Explore Marketplace");
    expect(html).toContain('/marketplace');
  });
});
