import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/vendor/Header", () => ({
  VendorHeader: () => <header>Vendor Header</header>,
}));

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
  };
});

vi.mock("@/components/payments/VendorPaymentPanel", () => ({
  VendorPaymentPanel: () => <div>Vendor payment panel</div>,
}));

import { VendorDashboard } from "../src/components/vendor/Dashboard";

const recentRequests = [
  {
    id: "req-1",
    createdAt: new Date("2027-01-10T10:00:00.000Z"),
    contactName: "Avery Client",
    contactEmail: "avery@example.com",
    startAt: new Date("2027-06-15T18:00:00.000Z"),
    endAt: new Date("2027-06-15T23:00:00.000Z"),
    status: "PENDING",
    event: {
      id: "event-1",
      name: "Scout Gala",
      startAt: new Date("2027-06-15T18:00:00.000Z"),
    },
    listing: {
      title: "Full-service catering",
    },
  },
  {
    id: "req-2",
    createdAt: new Date("2027-01-09T10:00:00.000Z"),
    contactName: "Jordan Planner",
    contactEmail: "jordan@example.com",
    startAt: new Date("2027-05-20T18:00:00.000Z"),
    endAt: new Date("2027-05-20T23:00:00.000Z"),
    status: "QUOTED",
    event: {
      id: "event-2",
      name: "Founders Dinner",
      startAt: new Date("2027-05-20T18:00:00.000Z"),
    },
    listing: {
      title: "Chef tasting menu",
    },
  },
];

const paymentContracts = [
  {
    id: "contract-1",
    title: "Scout Gala catering agreement",
    status: "IN_PAYMENT",
    proposal: {
      id: "proposal-1",
      currency: "USD",
      milestones: [
        {
          id: "milestone-1",
          title: "Deposit",
          amountCents: 250000,
          status: "IN_ESCROW",
          dueDate: new Date("2027-04-01T00:00:00.000Z"),
        },
      ],
    },
    event: {
      name: "Scout Gala",
      startAt: new Date("2027-06-15T18:00:00.000Z"),
    },
  },
];

describe("Vendor dashboard MVP tabs", () => {
  it("renders a useful calendar panel from request and milestone dates without placeholders", () => {
    render(
      <VendorDashboard
        orgName="Scout Catering"
        orgSlug="scout-catering"
        stats={{ todaysLeads: 1, upcomingEvents: 2, unreadMessages: 3 }}
        recentRequests={recentRequests}
        paymentContracts={paymentContracts}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("heading", { name: "Calendar & scheduling" })).toBeInTheDocument();
    expect(screen.getByText("Scout Gala")).toBeInTheDocument();
    expect(screen.getByText("Founders Dinner")).toBeInTheDocument();
    expect(screen.getByText("Payment milestone deadlines")).toBeInTheDocument();
    expect(screen.getByText(/Deposit/)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });

  it("renders messages as a real communication queue with contact paths", () => {
    render(
      <VendorDashboard
        orgName="Scout Catering"
        orgSlug="scout-catering"
        stats={{ todaysLeads: 1, upcomingEvents: 2, unreadMessages: 3 }}
        recentRequests={recentRequests}
        paymentContracts={paymentContracts}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));

    expect(screen.getByRole("heading", { name: "Messages & follow-up" })).toBeInTheDocument();
    expect(screen.getByText("3 unread notifications")).toBeInTheDocument();
    expect(screen.getByText("Avery Client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email Avery Client" })).toHaveAttribute(
      "href",
      "mailto:avery@example.com",
    );
    expect(screen.getByRole("link", { name: "support@onehub.events" })).toHaveAttribute(
      "href",
      "mailto:support@onehub.events",
    );
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
  });

  it("renders settings as inline editable fields and persists dashboard changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ org: { name: "Scout Catering Co." }, listing: { title: "Premium catering" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <VendorDashboard
        orgName="Scout Catering"
        orgSlug="scout-catering"
        orgProfile={{
          about: "Full-service hospitality team",
          contactEmail: "team@scout.test",
          contactPhone: "555-0100",
          website: "https://scout.test",
          city: "Atlanta",
          state: "GA",
        }}
        primaryListing={{
          id: "listing-1",
          title: "Full-service catering",
          description: "Dinner service and staffing",
          email: "bookings@scout.test",
          phone: "555-0101",
          website: "https://scout.test/catering",
          priceTier: 3,
        }}
        stats={{ todaysLeads: 1, upcomingEvents: 2, unreadMessages: 3 }}
        recentRequests={recentRequests}
        paymentContracts={paymentContracts}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("heading", { name: "Vendor settings & readiness" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Scout Catering Co." } });
    fireEvent.change(screen.getByLabelText("Listing title"), { target: { value: "Premium catering" } });
    fireEvent.click(screen.getByRole("button", { name: "Save vendor settings" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/vendor/settings",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("Scout Catering Co."),
      }),
    ));
    expect(fetchMock.mock.calls[0][1].body).toContain("Premium catering");
    expect(await screen.findByText("Vendor settings saved." )).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage listings" })).toHaveAttribute("href", "/marketplace/manage");
    expect(screen.getByText(/Private pilot boundary/)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
