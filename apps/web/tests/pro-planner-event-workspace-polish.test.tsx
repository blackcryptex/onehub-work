import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCurrentUser, prisma, requireAuthorizedEventBySlug, redirect, notFound } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireAuthorizedEventBySlug: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  prisma: {
    event: { findUnique: vi.fn() },
    activity: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/event-access", () => ({ requireAuthorizedEventBySlug }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({
  canAccessDashboard: () => true,
  canManageEvent: () => true,
  canDeleteEvent: () => false,
}));
vi.mock("next/navigation", () => ({ redirect, notFound }));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Button: ({ children, asChild: _asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
      React.createElement("button", props, children),
    Card: ({ children, className, id }: { children?: React.ReactNode; className?: string; id?: string }) =>
      React.createElement("section", { className, id }, children),
  };
});
vi.mock("@/components/layout/Topbar", () => ({ Topbar: () => <header>Topbar</header> }));
vi.mock("@/components/admin/ImpersonationBanner", () => ({ ImpersonationBanner: () => null }));
vi.mock("@/components/proposals/GenerateProposalButton", () => ({ GenerateProposalButton: () => <button>Generate proposal</button> }));
vi.mock("@/components/events/EventActions", () => ({ EventActions: () => <button>Event actions</button> }));
vi.mock("@/components/events/ShareEventButton", () => ({ ShareEventButton: () => <button>Share event</button> }));
vi.mock("@/components/vault/StakeholdersSectionClient", () => ({ StakeholdersSectionClient: () => <div>Stakeholders</div> }));
vi.mock("@/components/vault/AiSourceVendorsVenuesPanel", () => ({ AiSourceVendorsVenuesPanel: () => <div>AI source vendors</div> }));
vi.mock("@/components/shortlist/AddToShortlistButtonClient", () => ({ AddToShortlistButtonClient: () => <button>Add to shortlist</button> }));

import ProVaultDetailPage from "../src/app/pro/planner/vault/[eventSlug]/page";

const event = {
  id: "event-1",
  name: "Smith Wedding Weekend",
  slug: "smith-wedding-weekend",
  status: "PLANNING",
  type: "WEDDING",
  startAt: new Date("2027-05-10T18:00:00.000Z"),
  venueCity: "Atlanta",
  venueState: "GA",
  guestTarget: 150,
  objective: "Create a clear luxury wedding weekend plan.",
  org: {
    owner: { name: "Planner Owner", email: "owner@example.com" },
    members: [{ user: { name: "Coordinator", email: "coord@example.com" } }],
  },
  createdBy: { name: "Planner Owner", email: "owner@example.com" },
  stakeholders: [{ id: "stakeholder-1", userId: "client-1", role: "CLIENT", user: { id: "client-1", name: "Maya Client", email: "maya@example.com" } }],
  shares: [],
  budgetLines: [{ plannedCents: 1000000, actualCents: 250000, category: "VENUE" }],
  milestones: [{ id: "milestone-1", title: "Final walkthrough", dueAt: new Date("2027-04-15T12:00:00.000Z"), done: false }],
  checklists: [{ title: "Launch", items: [{ id: "item-1", title: "Confirm floorplan", done: false }] }],
  guestLists: [{ id: "guest-list-1", guests: [{ status: "ACCEPTED", invitations: [] }, { status: "PENDING", invitations: [] }] }],
  bookingRequests: [],
  shortlistItems: [],
  proposals: [],
  contracts: [],
  activities: [],
};

describe("Pro planner event workspace polish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", email: "planner@example.com", name: "Planner" });
    requireAuthorizedEventBySlug.mockResolvedValue({ event: { id: event.id, slug: event.slug, name: event.name } });
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.activity.findMany.mockResolvedValue([]);
  });

  it("explains the event workspace in plain planner language with direct next-click lanes", async () => {
    const page = await ProVaultDetailPage({ params: Promise.resolve({ eventSlug: "smith-wedding-weekend" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Planner event workspace");
    expect(html).toContain("Start here when you need to move this event forward");
    expect(html).toContain("Approvals &amp; decisions");
    expect(html).toContain("Messages");
    expect(html).toContain("Documents");
    expect(html).toContain("Payments");
    expect(html).toContain("Guests");
    expect(html).toContain("Budget");
    expect(html).toContain("Timeline");
    expect(html).toContain("Open messages");
    expect(html).toContain("Open event files");
  });

  it("does not count planner/listing-backed proposals as provider-backed or vendor-ready", async () => {
    prisma.event.findUnique.mockResolvedValue({
      ...event,
      proposals: [
        {
          id: "proposal-planner-sent",
          title: "Planner floral draft",
          status: "SENT",
          listingId: "listing-1",
          totalCents: 250000,
          milestones: [],
          listing: { id: "listing-1", title: "Avery Florals", type: "VENDOR" },
          contract: null,
        },
      ],
    });
    prisma.activity.findMany.mockResolvedValue([]);

    const page = await ProVaultDetailPage({ params: Promise.resolve({ eventSlug: "smith-wedding-weekend" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("0 provider-backed");
    expect(html).toContain("1 draft/planner/listing-backed request");
    expect(html).toContain("No provider-backed proposals are attached yet.");
    expect(html).toContain("listing-backed draft not counted as vendor-ready");
  });

  it("counts proposals as provider-backed only when provider-submitted evidence exists", async () => {
    prisma.event.findUnique.mockResolvedValue({
      ...event,
      proposals: [
        {
          id: "proposal-provider-submitted",
          title: "Provider floral quote",
          status: "SENT",
          listingId: "listing-1",
          totalCents: 250000,
          milestones: [],
          listing: { id: "listing-1", title: "Avery Florals", type: "VENDOR" },
          contract: null,
        },
      ],
    });
    prisma.activity.findMany.mockResolvedValue([{ target: "proposal-provider-submitted" }]);

    const page = await ProVaultDetailPage({ params: Promise.resolve({ eventSlug: "smith-wedding-weekend" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("1 provider-backed");
    expect(html).toContain("Provider-backed / Status: SENT / $2500.00");
    expect(html).not.toContain("No provider-backed proposals are attached yet.");
  });
});
