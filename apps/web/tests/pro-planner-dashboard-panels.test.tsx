import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/events/EventActions", () => ({
  EventActions: () => <button>Event actions</button>,
}));

vi.mock("@/components/pro-planner/Header", () => ({
  ProPlannerHeader: () => <header>Pro Planner Header</header>,
}));

vi.mock("@/components/ui", () => {
  return {
    Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    Button: ({ children, asChild: _asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => (
      <button {...props}>{children}</button>
    ),
  };
});

import { ProPlannerDashboard } from "../src/components/pro-planner/Dashboard";

const events = [
  {
    id: "event-1",
    name: "Smith Gala",
    slug: "smith-gala",
    startAt: new Date("2027-06-01T18:00:00.000Z"),
    endAt: new Date("2027-06-01T23:00:00.000Z"),
    type: "CORPORATE_EVENT",
    guestTarget: 180,
    venueCity: "Austin",
    venueState: "TX",
    status: "PLANNING",
    org: { name: "North Star Planning", slug: "north-star", ownerId: "owner-1" },
    createdBy: { id: "planner-1", name: "Planner" },
    bookingRequests: [
      { id: "request-1", status: "PENDING", listing: { title: "Austin Florals", category: "FLORIST", type: "VENDOR" } },
    ],
    shortlistItems: [
      { id: "shortlist-1", listing: { title: "Austin Florals", category: "FLORIST", type: "VENDOR" } },
    ],
    milestones: [
      { id: "milestone-1", title: "Vendor deposits due", dueAt: new Date("2027-05-01T12:00:00.000Z"), done: false },
    ],
    proposals: [
      {
        id: "proposal-1",
        title: "Floral proposal",
        status: "ACCEPTED",
        totalCents: 240000,
        currency: "USD",
        milestones: [{ id: "pay-ms-1", title: "Deposit", status: "PENDING", amountCents: 80000 }],
        contract: { id: "contract-1", title: "Floral contract", status: "FULLY_SIGNED" },
      },
    ],
    contracts: [
      {
        id: "contract-1",
        title: "Floral contract",
        status: "FULLY_SIGNED",
        proposal: { id: "proposal-1", title: "Floral proposal" },
        paymentIntents: [
          { id: "pi-1", status: "REQUIRES_PAYMENT", amountCents: 80000, currency: "USD" },
        ],
      },
    ],
  },
];

const orgProfile = {
  slug: "north-star",
  about: "Full-service planning for private pilot events.",
  city: "Austin",
  state: "TX",
  contactEmail: "hello@northstar.test",
  website: "https://northstar.test",
  profileStatus: "PUBLISHED",
  servicesJson: [],
  availabilityJson: { minNoticeDays: 14, maxEventsPerDay: 1, serviceAreaRadiusMiles: 75, blackoutDates: ["2027-01-01"] },
  paymentsJson: { depositType: "percent", depositValue: 25, finalDueDaysBeforeEvent: 14 },
  mediaJson: { galleryUrls: ["/portfolio.jpg"] },
  settings: { timezone: "America/Chicago", currency: "USD", billingEmail: "billing@northstar.test" },
  listings: [
    {
      id: "listing-1",
      title: "Full-service planning",
      type: "VENDOR",
      category: "PLANNER",
      description: "Planning package tied to event execution.",
      city: "Austin",
      state: "TX",
      ratingAvg: 4.9,
      ratingCount: 12,
      offers: [{ id: "offer-1", name: "Planning retainer", priceCents: 150000, unit: "event" }],
      gallery: [{ id: "media-1", url: "/gallery.jpg", caption: "Reception" }],
    },
  ],
};

function renderDashboard() {
  return render(
    <ProPlannerDashboard
      orgName="North Star Planning"
      events={events}
      userId="planner-1"
      userRole="PRO_PLANNER"
      orgOwnerId="owner-1"
      orgProfile={orgProfile}
    />,
  );
}

describe("Pro Planner dashboard MVP panels", () => {
  it("replaces placeholder tabs with event and transaction workflow panels", () => {
    renderDashboard();

    const expectations = [
      ["Services", "Services & event needs", "Event demand queue"],
      ["Availability", "Availability & booking timeline", "Nearest deadlines"],
      ["Payments", "Payments & contracts", "Manual-status-first MVP"],
      ["Portfolio", "Portfolio & profile readiness", "Readiness checklist"],
      ["Settings", "Settings & account status", "Operational boundaries"],
    ] as const;

    for (const [navLabel, heading, proofText] of expectations) {
      fireEvent.click(screen.getByRole("button", { name: navLabel }));
      expect(screen.getByText(heading)).toBeInTheDocument();
      expect(screen.getByText(proofText)).toBeInTheDocument();
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
    }
  });

  it("keeps overview event list, create event, and vault actions intact", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: "Create Event" })).toHaveAttribute("href", "/events/new");
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/messages");
    expect(screen.getByRole("link", { name: "Smith Gala" })).toHaveAttribute("href", "/pro/planner/vault/smith-gala");
    expect(screen.getByRole("button", { name: "Event actions" })).toBeInTheDocument();
  });

  it("uses overview cards as real dashboard entry points instead of setup placeholders", () => {
    renderDashboard();

    expect(screen.getByText("Review active event vendor gaps, published services, and package coverage.")).toBeInTheDocument();
    expect(screen.getByText("Use event dates, milestone due dates, and booking rules to plan capacity.")).toBeInTheDocument();
    expect(screen.getByText("Monitor contracts, payment intents, and manual milestone status without activating live payments.")).toBeInTheDocument();
    expect(screen.getByText("Audit the client-facing profile, marketplace proof, and readiness gaps.")).toBeInTheDocument();
    expect(screen.getByText("Review organization, account, and safe operational status from loaded records.")).toBeInTheDocument();
    expect(screen.queryByText(/Configure payment methods and contract templates/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload portfolio photos and branding/i)).not.toBeInTheDocument();
  });

  it("shows manual payment status instead of live-payment activation controls", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Payments" }));
    const paymentPanel = screen.getByText("Payments & contracts").closest("section");

    expect(paymentPanel).not.toBeNull();
    expect(within(paymentPanel as HTMLElement).getByText(/Live payment activation remains off here/i)).toBeInTheDocument();
    expect(within(paymentPanel as HTMLElement).getByText("Floral contract")).toBeInTheDocument();
    expect(within(paymentPanel as HTMLElement).queryByRole("button", { name: /activate payment/i })).not.toBeInTheDocument();
  });
});
