import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
    Button: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
      <button className={className}>{children}</button>
    ),
  };
});

import { DemoTour } from "../src/components/vault/DemoTour";

describe("DemoTour event navigation", () => {
  it("uses the DIY planner event vault path for demo event links", () => {
    const html = renderToStaticMarkup(
      <DemoTour eventSlug="spring-gala" eventId="event-1" role="DIY_PLANNER" show />
    );

    expect(html).toContain('href="/diy-planner/vault/spring-gala"');
    expect(html).not.toContain('href="/app/vault/spring-gala"');
  });

  it("uses the client-safe event path for client demo event links", () => {
    const html = renderToStaticMarkup(
      <DemoTour eventSlug="shared-gala" eventId="event-2" role="CLIENT" show />
    );

    expect(html).toContain('href="/client/events/shared-gala"');
    expect(html).not.toContain('href="/app/vault/shared-gala"');
  });

  it("keeps the legacy event vault fallback when no role is provided", () => {
    const html = renderToStaticMarkup(
      <DemoTour eventSlug="legacy-gala" eventId="event-3" show />
    );

    expect(html).toContain('href="/app/vault/legacy-gala"');
  });
});
