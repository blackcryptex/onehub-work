import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCurrentUser, redirect, requireAuthorizedEventBySlug, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  requireAuthorizedEventBySlug: vi.fn(),
  prisma: {
    organization: { findMany: vi.fn() },
    guestList: { findMany: vi.fn() },
    checklist: { findMany: vi.fn() },
    event: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/event-access", () => ({ requireAuthorizedEventBySlug }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Button: ({ children, asChild: _asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
      React.createElement("button", props, children),
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
    BudgetTable: ({ lines }: { lines: unknown[] }) =>
      React.createElement("div", { "data-testid": "budget-table" }, `Budget rows: ${lines.length}`),
  };
});

vi.mock("@/components/EventActionBar", () => ({
  default: ({ tab }: { tab: string }) => <div data-testid="event-action-bar">active:{tab}</div>,
}));
vi.mock("@/components/panes/VendorsPane", () => ({ default: () => <div>Vendors Pane</div> }));
vi.mock("@/components/panes/ProposalsPane", () => ({ default: () => <div>Proposals Pane</div> }));
vi.mock("@/components/panes/ContractsPane", () => ({ default: () => <div>Contracts Pane</div> }));
vi.mock("@/components/panes/BudgetPane", () => ({ default: () => <div>Budget Pane</div> }));
vi.mock("@/components/panes/GuestsPane", () => ({ default: () => <div>Guests Pane</div> }));
vi.mock("@/components/panes/TasksMilestonesPane", () => ({ default: () => <div>Tasks Pane</div> }));

import EventManagementSection from "../src/components/EventManagementSection";
import EventGuests from "../src/app/(app)/events/[eventSlug]/guests/page";
import EventChecklists from "../src/app/(app)/events/[eventSlug]/checklists/page";
import EventBudget from "../src/app/(app)/events/[eventSlug]/budget/page";
import LegacyAppVaultPage from "../src/app/app/vault/page";

const event = {
  id: "event-1",
  name: "Scout Gala",
  date: "2027-05-01T18:00:00.000Z",
  progress: 25,
};

describe("DIY planner route continuity cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({
      id: "diy-1",
      email: "diy@test.local",
      name: "DIY Planner",
      role: "DIY_PLANNER",
    });
    requireAuthorizedEventBySlug.mockResolvedValue({
      event: { id: "event-1", name: "Scout Gala", slug: "scout-gala" },
    });
    prisma.organization.findMany.mockResolvedValue([]);
  });

  it("can open the requested dashboard event tab instead of always defaulting to vendors", () => {
    render(
      <EventManagementSection
        event={event}
        initialTab="budget"
        onEventChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("event-action-bar")).toHaveTextContent("active:budget");
    expect(screen.getByText("Budget Pane")).toBeInTheDocument();
    expect(screen.queryByText("Vendors Pane")).not.toBeInTheDocument();
  });

  it("renders guest empty state with event context and vault return link", async () => {
    prisma.guestList.findMany.mockResolvedValue([]);

    const page = await EventGuests({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Scout Gala");
    expect(html).toContain("Guest list");
    expect(html).toContain("Back to Event Vault");
    expect(html).toContain('/diy-planner/vault/scout-gala');
    expect(html).toContain("Start by adding guests");
  });

  it("renders checklist empty state with event context and vault return link", async () => {
    prisma.checklist.findMany.mockResolvedValue([]);

    const page = await EventChecklists({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Scout Gala");
    expect(html).toContain("Checklists");
    expect(html).toContain("Back to Event Vault");
    expect(html).toContain('/diy-planner/vault/scout-gala');
    expect(html).toContain("Build your planning checklist");
  });

  it("renders budget route with event context and vault return link", async () => {
    prisma.event.findUnique.mockResolvedValue({ id: "event-1", name: "Scout Gala", budgetLines: [] });

    const page = await EventBudget({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Scout Gala");
    expect(html).toContain("Budget");
    expect(html).toContain("Back to Event Vault");
    expect(html).toContain('/diy-planner/vault/scout-gala');
    expect(html).toContain("Track planned and actual spend");
  });

  it("does not self-redirect an admin visiting the legacy app vault", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.local",
      name: "Admin User",
      role: "ADMIN",
    });

    const page = await LegacyAppVaultPage();
    const html = renderToStaticMarkup(page);

    expect(redirect).not.toHaveBeenCalledWith("/app/vault");
    expect(html).toContain("Event Vault");
  });

  it("normalizes DIY and PRO planners from legacy app vault to canonical planner vaults", async () => {
    getCurrentUser.mockResolvedValue({
      id: "diy-1",
      email: "diy@test.local",
      name: "DIY Planner",
      role: "DIY_PLANNER",
    });
    await expect(LegacyAppVaultPage()).rejects.toThrow("redirect:/diy-planner/vault");

    getCurrentUser.mockResolvedValue({
      id: "pro-1",
      email: "pro@test.local",
      name: "Pro Planner",
      role: "PRO_PLANNER",
    });
    await expect(LegacyAppVaultPage()).rejects.toThrow("redirect:/pro/planner/vault");
  });
});
