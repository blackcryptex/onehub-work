import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/venue/Header", () => ({
  VenueHeader: () => <header>Venue Header</header>,
}));

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
  };
});

import { VenueDashboard } from "../src/components/venue/Dashboard";

const recentRequests = [
  {
    id: "venue-req-1",
    createdAt: new Date("2027-02-10T10:00:00.000Z"),
    contactName: "Avery Client",
    contactEmail: "avery@example.com",
    startAt: new Date("2027-09-15T18:00:00.000Z"),
    endAt: new Date("2027-09-15T23:00:00.000Z"),
    status: "PENDING",
    event: {
      id: "event-1",
      name: "Scout Gala",
      startAt: new Date("2027-09-15T18:00:00.000Z"),
    },
    listing: {
      title: "Grand Ballroom",
      capacity: 250,
    },
  },
  {
    id: "venue-req-2",
    createdAt: new Date("2027-02-09T10:00:00.000Z"),
    contactName: "Jordan Planner",
    contactEmail: "jordan@example.com",
    startAt: new Date("2027-08-20T18:00:00.000Z"),
    endAt: new Date("2027-08-20T23:00:00.000Z"),
    status: "QUOTED",
    event: {
      id: "event-2",
      name: "Founders Dinner",
      startAt: new Date("2027-08-20T18:00:00.000Z"),
    },
    listing: {
      title: "Rooftop Terrace",
      capacity: 120,
    },
  },
];

const paymentContracts = [
  {
    id: "contract-1",
    title: "Scout Gala venue agreement",
    status: "IN_PAYMENT",
    proposal: {
      id: "proposal-1",
      currency: "USD",
      milestones: [
        {
          id: "milestone-1",
          title: "Venue deposit",
          amountCents: 500000,
          status: "IN_ESCROW",
          dueDate: new Date("2027-06-01T00:00:00.000Z"),
        },
      ],
    },
    event: {
      name: "Scout Gala",
      startAt: new Date("2027-09-15T18:00:00.000Z"),
    },
  },
];

function renderVenue() {
  return render(
    <VenueDashboard
      orgName="Scout Venue"
      orgSlug="scout-venue"
      stats={{ todaysLeads: 1, upcomingBookings: 2, unreadMessages: 4 }}
      recentRequests={recentRequests}
      paymentContracts={paymentContracts}
    />,
  );
}

describe("Venue dashboard MVP tabs", () => {
  it("renders leads as a venue booking request pipeline without placeholders", () => {
    renderVenue();

    fireEvent.click(screen.getByRole("button", { name: "Leads" }));

    expect(screen.getByRole("heading", { name: "Leads & venue booking requests" })).toBeInTheDocument();
    expect(screen.getByText("Grand Ballroom")).toBeInTheDocument();
    expect(screen.getByText(/Capacity 250/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email Avery Client" })).toHaveAttribute("href", "mailto:avery@example.com");
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });

  it("renders calendar as venue booking and milestone schedule", () => {
    renderVenue();

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("heading", { name: "Venue calendar & booking holds" })).toBeInTheDocument();
    expect(screen.getByText("Scout Gala")).toBeInTheDocument();
    expect(screen.getByText("Founders Dinner")).toBeInTheDocument();
    expect(screen.getByText("Venue payment milestone deadlines")).toBeInTheDocument();
    expect(screen.getByText(/Venue deposit/)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("renders messages as a real venue follow-up queue", () => {
    renderVenue();

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));

    expect(screen.getByRole("heading", { name: "Venue messages & follow-up" })).toBeInTheDocument();
    expect(screen.getByText("4 unread notifications")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email Avery Client" })).toHaveAttribute("href", "mailto:avery@example.com");
    expect(screen.getByRole("button", { name: "Open OneHub thread for Avery Client" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open message inbox" })).toHaveAttribute("href", "/messages");
    expect(screen.getByRole("link", { name: "support@onehub.events" })).toHaveAttribute("href", "mailto:support@onehub.events");
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("renders settings as venue readiness controls with private pilot boundaries", () => {
    renderVenue();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("heading", { name: "Venue settings & readiness" })).toBeInTheDocument();
    expect(screen.getByText("Scout Venue")).toBeInTheDocument();
    expect(screen.getByText("scout-venue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage venue listings" })).toHaveAttribute("href", "/marketplace/manage");
    expect(screen.getByRole("link", { name: "Review venue profile" })).toHaveAttribute("href", "/providers/onboarding?providerType=venue");
    expect(screen.getByRole("link", { name: "Check payout readiness" })).toHaveAttribute("href", "/app/billing/connect");
    expect(screen.getByText(/Private pilot boundary/)).toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });
});
