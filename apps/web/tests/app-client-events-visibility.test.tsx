import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { auth, getCurrentUser, prisma, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  prisma: {
    organization: { findMany: vi.fn() },
    event: { findMany: vi.fn(), count: vi.fn() },
    activity: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("div", props, children),
    Button: ({ children, asChild: _asChild, variant: _variant, ...props }: { children?: React.ReactNode; asChild?: boolean; variant?: string }) =>
      React.createElement("button", props, children),
  };
});

import AppPage from "../src/app/app/page";

describe("client event visibility on app dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({
      user: { id: "client-1", email: "client@test.local", name: "Client One", role: "CLIENT" },
    });
    getCurrentUser.mockResolvedValue({
      id: "client-1",
      email: "client@test.local",
      name: "Client One",
      role: "CLIENT",
    });
    prisma.organization.findMany.mockResolvedValue([
      { id: "org-1", name: "Planner Org", _count: { members: 2, events: 3 } },
    ]);
    prisma.event.findMany.mockResolvedValue([
      {
        id: "event-1",
        name: "Shared Gala",
        slug: "shared-gala",
        startAt: new Date("2027-05-01T18:00:00.000Z"),
        org: { name: "Planner Org", slug: "planner-org" },
      },
    ]);
    prisma.activity.findMany.mockResolvedValue([]);
  });

  it("lists only events where the client is a stakeholder with summary share", async () => {
    await AppPage();

    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        stakeholders: { some: { userId: "client-1", role: "CLIENT" } },
        shares: { some: { viewerUserId: "client-1", scope: "SUMMARY" } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }));
  });

  it("links visible client events to the client-safe event surface and hides the dead vault list link", async () => {
    const page = await AppPage();
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Shared Gala");
    expect(html).toContain("/client/events/shared-gala");
    expect(html).not.toContain("/app/vault");
  });
});
