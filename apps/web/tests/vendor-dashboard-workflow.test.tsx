import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/ui", () => ({
  Card: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => <div className={className}>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/payments/VendorPaymentPanel", () => ({
  VendorPaymentPanel: ({ contracts }: { contracts: unknown[] }) => (
    <section aria-label="payment panel">Payment panel contracts: {contracts.length}</section>
  ),
}));

import { VendorDashboard } from "../src/components/vendor/Dashboard";

const recentRequests = [
  {
    id: "request-new",
    createdAt: new Date("2027-04-01T10:00:00.000Z"),
    contactName: "Maya Client",
    contactEmail: "maya@example.com",
    startAt: new Date("2027-05-10T18:00:00.000Z"),
    endAt: new Date("2027-05-10T23:00:00.000Z"),
    status: "PENDING",
    event: { id: "event-1", name: "Garden Gala", startAt: new Date("2027-05-10T18:00:00.000Z") },
    listing: { title: "Full-service floral design" },
  },
  {
    id: "request-quoted",
    createdAt: new Date("2027-03-28T10:00:00.000Z"),
    contactName: "Noah Planner",
    contactEmail: "noah@example.com",
    startAt: new Date("2027-04-22T18:00:00.000Z"),
    endAt: new Date("2027-04-22T23:00:00.000Z"),
    status: "QUOTED",
    event: { id: "event-2", name: "Spring Fundraiser", startAt: new Date("2027-04-22T18:00:00.000Z") },
    listing: { title: "Reception florals" },
  },
];

const paymentContracts = [
  {
    id: "contract-1",
    title: "Garden Gala florals",
    status: "IN_PAYMENT",
    proposal: {
      id: "proposal-1",
      currency: "USD",
      milestones: [
        {
          id: "milestone-1",
          title: "Deposit",
          amountCents: 150000,
          status: "IN_ESCROW",
          dueDate: new Date("2027-04-15T12:00:00.000Z"),
        },
      ],
    },
    event: { name: "Garden Gala", startAt: new Date("2027-05-10T18:00:00.000Z") },
  },
];

function renderDashboard(overrides: Partial<React.ComponentProps<typeof VendorDashboard>> = {}) {
  render(
    <VendorDashboard
      orgName="Avery Florals"
      orgSlug="avery-florals"
      stats={{ todaysLeads: 1, upcomingEvents: 2, unreadMessages: 3 }}
      recentRequests={recentRequests}
      paymentContracts={paymentContracts}
      profileReadiness={{ hasListings: true, hasContact: true, hasAvailability: false, hasPaymentSetup: false }}
      {...overrides}
    />
  );
}

describe("VendorDashboard lead response workflow", () => {
  it("answers the first-screen lead response questions with real next actions", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Lead response command center" })).toBeInTheDocument();
    expect(screen.getByText("1 new lead")).toBeInTheDocument();
    expect(screen.getByText("1 follow-up needed")).toBeInTheDocument();
    expect(screen.getByText(/Next service date: 4\/22\/2027/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual payment readiness: Funds held/i)).toBeInTheDocument();
    expect(screen.getByText(/Next safe response: Reply to Maya Client/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Respond in Leads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review payment readiness" })).toBeInTheDocument();
  });

  it("routes first-screen actions into useful vendor surfaces instead of coming-soon placeholders", () => {
    const { container } = render(
      <VendorDashboard
        orgName="Avery Florals"
        orgSlug="avery-florals"
        stats={{ todaysLeads: 0, upcomingEvents: 0, unreadMessages: 0 }}
        recentRequests={[]}
        paymentContracts={[]}
        profileReadiness={{ hasListings: false, hasContact: false, hasAvailability: false, hasPaymentSetup: false }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Respond in Leads" }));
    expect(screen.getByRole("heading", { name: "Leads & Booking Requests" })).toBeInTheDocument();
    expect(screen.getByText(/No active leads yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("heading", { name: "Calendar & Bookings" })).toBeInTheDocument();
    expect(screen.getByText(/No dated booking requests yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(screen.getByRole("heading", { name: "Lead Messages" })).toBeInTheDocument();
    expect(screen.getByText(/Lead contact starts from booking requests/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Profile readiness" })).toBeInTheDocument();
    expect(screen.getByText(/Add at least one listing/i)).toBeInTheDocument();

    expect(container).not.toHaveTextContent(/coming soon|placeholder|goes here/i);
  });
});
