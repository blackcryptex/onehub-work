import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/ui", () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  Button: ({
    children,
    asChild,
    className,
  }: React.PropsWithChildren<{ asChild?: boolean; className?: string }>) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        className: [children.props.className, className].filter(Boolean).join(" "),
      });
    }

    return <button className={className}>{children}</button>;
  },
}));

vi.mock("@/components/payments/VendorPaymentPanel", () => ({
  VendorPaymentPanel: () => <div data-testid="vendor-payment-panel" />,
}));

vi.mock("../src/components/vendor/Header", () => ({
  VendorHeader: () => <header>Vendor header</header>,
}));

vi.mock("../src/components/vendor/Sidebar", () => ({
  VendorSidebar: () => <nav>Vendor sidebar</nav>,
}));

vi.mock("../src/components/venue/Header", () => ({
  VenueHeader: () => <header>Venue header</header>,
}));

vi.mock("../src/components/venue/Sidebar", () => ({
  VenueSidebar: () => <nav>Venue sidebar</nav>,
}));

import { VendorDashboard } from "../src/components/vendor/Dashboard";
import { VenueDashboard } from "../src/components/venue/Dashboard";

const stats = {
  todaysLeads: 0,
  upcomingEvents: 0,
  unreadMessages: 0,
};

const venueStats = {
  todaysLeads: 0,
  upcomingBookings: 0,
  unreadMessages: 0,
};

describe("P5 provider booking UX flow smoke", () => {
  it("keeps vendor request and listing actions discoverable from dashboard empty states", () => {
    render(
      <VendorDashboard
        orgName="Acme Catering"
        orgSlug="acme-catering"
        stats={stats}
        recentRequests={[]}
      />
    );

    expect(screen.getByRole("link", { name: "View booking requests" }).getAttribute("href")).toBe("/requests");
    expect(screen.getByRole("link", { name: "Manage listings" }).getAttribute("href")).toBe("/marketplace/manage");
    expect(screen.getByRole("link", { name: "Create or update listing" }).getAttribute("href")).toBe("/marketplace/manage");
  });

  it("keeps venue request and listing actions discoverable from dashboard empty states", () => {
    render(
      <VenueDashboard
        orgName="OneHub Hall"
        stats={venueStats}
        recentRequests={[]}
      />
    );

    expect(screen.getByRole("link", { name: "View booking requests" }).getAttribute("href")).toBe("/requests");
    expect(screen.getByRole("link", { name: "Manage venue listing" }).getAttribute("href")).toBe("/marketplace/manage");
    expect(screen.getByRole("link", { name: "Create or update venue listing" }).getAttribute("href")).toBe("/marketplace/manage");
  });
});
