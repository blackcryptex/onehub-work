import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCurrentUser, requireAuthorizedEventBySlug, prisma, push, back } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireAuthorizedEventBySlug: vi.fn(),
  prisma: {
    event: { findFirst: vi.fn() },
  },
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/event-access", () => ({ requireAuthorizedEventBySlug }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({
  canViewEvent: vi.fn(() => true),
  isEventSharedWithUser: vi.fn(() => true),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: () => ({ push, back }),
  useParams: () => ({ eventSlug: "scout-gala" }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
    Button: ({ children, asChild: _asChild, variant: _variant, ...props }: { children?: React.ReactNode; asChild?: boolean; variant?: string }) =>
      React.createElement("button", props, children),
  };
});
vi.mock("@/components/layout/LandingHeader", () => ({
  LandingHeader: () => <header>OneHub</header>,
}));
vi.mock("@/components/client/DepositPanel", () => ({
  DepositPanel: () => <section>Deposit status</section>,
}));

const forbiddenPlaceholderCopy = /coming soon|placeholder|will be integrated here|what's coming|future update|links to nowhere/i;

const sharedClientEvent = {
  id: "event-1",
  name: "Scout Gala",
  slug: "scout-gala",
  startAt: new Date("2027-05-01T18:00:00.000Z"),
  venueCity: "Austin",
  venueState: "TX",
  guestTarget: 150,
  eventTypeCanonical: "gala",
  description: "Client-safe event summary",
  objective: "Raise funds",
  createdBy: { name: "Planner", email: "planner@test.local" },
  org: { id: "org-1", name: "Atlas Events", ownerId: "planner-1", owner: { name: "Planner", email: "planner@test.local" } },
  stakeholders: [{ userId: "client-1", role: "CLIENT" }],
  shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
  deposits: [],
};

describe("dashboard placeholder cleanup slice 3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "client-1", role: "CLIENT", name: "Client One", email: "client@test.local" });
    requireAuthorizedEventBySlug.mockResolvedValue({ event: { id: "event-1", name: "Scout Gala", slug: "scout-gala" } });
    prisma.event.findFirst.mockResolvedValue(sharedClientEvent);
  });

  it("renders the client event messages section as a truthful alternate path", async () => {
    const { default: ClientEventSummaryPage } = await import("../src/app/(app)/client/events/[eventSlug]/page");

    const page = await ClientEventSummaryPage({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Messages");
    expect(html).toContain("Use the Message Inbox to coordinate with your planner");
    expect(html).toContain('/messages');
    expect(html).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("renders event settings as a real review workflow with event context", async () => {
    const { default: EventSettings } = await import("../src/app/(app)/events/[eventSlug]/settings/page");

    const page = await EventSettings({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Scout Gala");
    expect(html).toContain("Event settings");
    expect(html).toContain("Review the event profile fields that drive planner and client-facing summaries");
    expect(html).toContain('/diy-planner/vault/scout-gala');
    expect(html).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("routes manual proposal creation to the real event vault proposal workflow", async () => {
    const { default: NewProposalPage } = await import("../src/app/(app)/events/[eventSlug]/proposals/new/page");

    render(<NewProposalPage />);

    expect(screen.getByRole("heading", { name: /create proposal/i })).toBeInTheDocument();
    expect(screen.getByText(/Create or compare proposals from the Event Vault/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open event vault proposals/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("renders vendor and venue ads as a truthful provider growth path without fake live ads", async () => {
    const { default: VendorVenueAdsPage } = await import("../src/app/vendor-venue-ads/page");

    const page = <VendorVenueAdsPage />;
    const html = renderToStaticMarkup(page);

    expect(html).toMatch(/Vendor (?:&amp;|&) Venue Ads/);
    expect(html).toContain("Ads are not live in this MVP");
    expect(html).toContain("Start with a provider profile");
    expect(html).toContain('/providers/start');
    expect(html).not.toMatch(/live ad campaign|paid placement|coming soon|placeholder/i);
  });
});
