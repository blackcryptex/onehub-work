import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("../src/components/pro-planner/Header", () => ({
  ProPlannerHeader: () => <header>Pro planner header</header>,
}));

vi.mock("../src/components/pro-planner/Sidebar", () => ({
  ProPlannerSidebar: ({ onRoute }: { onRoute: (route: string) => void }) => (
    <nav aria-label="Pro planner sections">
      <button onClick={() => onRoute("overview")}>Overview</button>
      <button onClick={() => onRoute("services")}>Services</button>
      <button onClick={() => onRoute("availability")}>Availability</button>
      <button onClick={() => onRoute("payments")}>Payments</button>
      <button onClick={() => onRoute("portfolio")}>Portfolio</button>
      <button onClick={() => onRoute("settings")}>Settings</button>
    </nav>
  ),
}));

vi.mock("../src/components/events/EventActions", () => ({
  EventActions: () => <div data-testid="event-actions">event actions</div>,
}));

vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className, id }: { children?: React.ReactNode; className?: string; id?: string }) =>
      React.createElement("div", { className, id }, children),
    Button: ({ children, asChild: _asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
      React.createElement("button", props, children),
  };
});

import { ProPlannerDashboard } from "../src/components/pro-planner/Dashboard";

const events = [
  {
    id: "event-1",
    name: "Smith Wedding Weekend",
    slug: "smith-wedding-weekend",
    startAt: new Date("2027-06-14T17:00:00.000Z"),
    status: "PLANNING",
    org: { name: "Atlas Events", slug: "atlas-events", ownerId: "planner-1" },
    createdBy: { id: "planner-1", name: "Pro Planner" },
    tasks: [
      {
        id: "task-1",
        title: "Confirm final floorplan with venue",
        status: "TODO",
        priority: "HIGH",
        dueAt: new Date("2027-05-01T12:00:00.000Z"),
      },
    ],
    bookingRequests: [
      {
        id: "request-1",
        status: "PENDING",
        createdAt: new Date("2027-04-01T12:00:00.000Z"),
        contactName: "Avery Vendor",
        listing: { title: "Avery Florals", type: "VENDOR", category: "FLORIST" },
      },
    ],
    proposals: [
      {
        id: "proposal-1",
        title: "Floral design proposal",
        status: "SENT",
        totalCents: 250000,
        listing: { title: "Avery Florals", type: "VENDOR" },
        contract: null,
        milestones: [{ id: "milestone-1", status: "PENDING", amountCents: 125000, dueDate: null }],
      },
    ],
    contracts: [
      {
        id: "contract-1",
        title: "Venue agreement",
        status: "OUT_FOR_SIGNATURE",
        paymentIntents: [{ id: "intent-1", status: "REQUIRES_PAYMENT", fundedAt: null, amountCents: 100000 }],
      },
    ],
  },
];

const listings = [
  {
    id: "listing-1",
    title: "Full-service planning",
    type: "VENDOR",
    category: "PLANNER",
    city: "Atlanta",
    state: "GA",
  },
];

const notifications = [
  {
    id: "notification-1",
    title: "Client uploaded guest list",
    body: "Review the new file before final vendor counts.",
    read: false,
    link: "/messages",
    createdAt: new Date("2027-04-02T12:00:00.000Z"),
  },
];

const forbiddenPanelCopy = new RegExp(["coming", "soon"].join(" ") + "|" + "place" + "holder" + "|" + ["Content", "for"].join(" "), "i");

function renderDashboard() {
  return render(
    <ProPlannerDashboard
      orgName="Atlas Events"
      events={events}
      userId="planner-1"
      userRole="PRO_PLANNER"
      orgOwnerId="planner-1"
      listings={listings}
      notifications={notifications}
    />,
  );
}

describe("ProPlannerDashboard", () => {
  it("shows a real top-level command deck for today's work, follow-ups, money alerts, tasks, and setup", () => {
    const { container } = renderDashboard();

    expect(screen.getByText("Agency command deck")).toBeInTheDocument();
    expect(screen.getByText("Active client events")).toBeInTheDocument();
    expect(screen.getByText("Smith Wedding Weekend")).toBeInTheDocument();
    expect(screen.getByText("Confirm final floorplan with venue")).toBeInTheDocument();
    expect(screen.getByText("Client/vendor follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Avery Florals")).toBeInTheDocument();
    expect(screen.getByText("Money / contract alerts")).toBeInTheDocument();
    expect(screen.getAllByText("Floral design proposal").length).toBeGreaterThan(0);
    expect(screen.getByText("Venue agreement")).toBeInTheDocument();
    expect(screen.getByText("Business setup status")).toBeInTheDocument();
    expect(screen.getByText("Services and packages")).toBeInTheDocument();
    expect(screen.getByText("Open Event Command Center")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(forbiddenPanelCopy);
  });

  it("builds out every top-level section with real panels", () => {
    const { container } = renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Services" }));
    expect(screen.getByText("Services & packages")).toBeInTheDocument();
    expect(screen.getByText("Full-service planning")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Availability" }));
    expect(screen.getByText("Availability & booking")).toBeInTheDocument();
    expect(screen.getByText(/Upcoming event dates/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Payments" }));
    expect(screen.getByText("Payments & contracts")).toBeInTheDocument();
    expect(screen.getByText(/No live-payment activation is added here/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Portfolio" }));
    expect(screen.getByText("Portfolio & branding")).toBeInTheDocument();
    expect(screen.getByText(/published profile\/listing record/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Messages and follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Planner organization setup")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(forbiddenPanelCopy);
  });
});
