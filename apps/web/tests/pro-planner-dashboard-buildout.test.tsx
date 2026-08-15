import * as React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("../src/components/pro-planner/Header", () => ({
  ProPlannerHeader: () => <header>Pro planner header</header>,
}));

vi.mock("../src/components/pro-planner/Sidebar", () => ({
  ProPlannerSidebar: ({ onRoute }: { onRoute: (route: string) => void }) => (
    <nav aria-label="Pro planner sections">
      <button onClick={() => onRoute("overview")}>Overview</button>
      <button onClick={() => onRoute("team")}>Team</button>
      <button onClick={() => onRoute("clients")}>Clients</button>
      <button onClick={() => onRoute("vendors")}>Vendors</button>
      <button onClick={() => onRoute("timeline")}>Timeline</button>
      <button onClick={() => onRoute("contracts")}>Contracts</button>
      <button onClick={() => onRoute("payments")}>Payments</button>
      <button onClick={() => onRoute("files")}>Files</button>
      <button onClick={() => onRoute("services")}>Services</button>
      <button onClick={() => onRoute("availability")}>Availability</button>
      <button onClick={() => onRoute("portfolio")}>Portfolio</button>
      <button onClick={() => onRoute("reports")}>Reports</button>
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
    Button: ({ children, asChild: _asChild, ...props }: { children?: React.ReactNode; asChild?: boolean; [key: string]: unknown }) =>
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
        assignee: { id: "assistant-1", name: "Jordan Assistant", email: "jordan@example.com" },
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
    milestones: [{ id: "event-milestone-1", title: "Final walkthrough", dueAt: new Date("2027-05-20T12:00:00.000Z"), done: false, order: 1 }],
    stakeholders: [{ id: "stakeholder-1", role: "CLIENT", user: { id: "client-1", name: "Maya Client", email: "maya@example.com" } }],
    media: [{ id: "media-1", url: "https://example.com/floorplan.pdf", caption: "Floorplan packet", createdAt: new Date("2027-04-02T12:00:00.000Z") }],
    threads: [{ id: "thread-1", subject: "Document review", createdAt: new Date("2027-04-03T12:00:00.000Z"), participants: [{ email: "maya@example.com", roleHint: "client" }], messages: [{ id: "message-1", createdAt: new Date("2027-04-03T12:00:00.000Z") }] }],
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

const members = [
  {
    id: "member-1",
    role: "OWNER",
    staffRole: "LEAD_PLANNER",
    createdAt: new Date("2027-01-01T12:00:00.000Z"),
    user: { id: "planner-1", name: "Pro Planner", email: "planner@example.com" },
    team: null,
  },
];

const invites = [
  {
    id: "invite-1",
    email: "pending@example.com",
    role: "MEMBER",
    expiresAt: new Date("2027-04-09T12:00:00.000Z"),
    createdAt: new Date("2027-04-02T12:00:00.000Z"),
  },
];

const forbiddenPanelCopy = new RegExp(["coming", "soon"].join(" ") + "|" + "place" + "holder" + "|" + ["Content", "for"].join(" "), "i");

function renderDashboard() {
  return render(
    <ProPlannerDashboard
      orgId="org-1"
      orgName="Atlas Events"
      events={events}
      userId="planner-1"
      userRole="PRO_PLANNER"
      orgOwnerId="planner-1"
      listings={listings}
      notifications={notifications}
      members={members}
      invites={invites}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

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

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    expect(screen.getByText("Team & assistant operations")).toBeInTheDocument();
    expect(screen.getByText("Jordan Assistant")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clients" }));
    expect(screen.getByText("Client command center")).toBeInTheDocument();
    expect(screen.getByText("Maya Client")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vendors" }));
    expect(screen.getByText("Vendor & venue relationship hub")).toBeInTheDocument();
    expect(screen.getAllByText("Avery Florals").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByText("Timeline, milestones & readiness")).toBeInTheDocument();
    expect(screen.getByText("Final walkthrough")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Contracts" }));
    expect(screen.getByText("Contracts command center")).toBeInTheDocument();
    expect(screen.getByText(/does not approve contracts/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(screen.getByText("Files & documents")).toBeInTheDocument();
    expect(screen.getByText("Floorplan packet")).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(screen.getByText("Reports & business intelligence")).toBeInTheDocument();
    expect(screen.getByText("Revenue pipeline")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Messages and follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Planner organization setup")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(forbiddenPanelCopy);
  });

  it("creates assistant invites through the guarded team invite endpoint", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        invite: {
          id: "invite-2",
          email: "new-assistant@example.com",
          role: "MEMBER",
          expiresAt: new Date("2027-04-10T12:00:00.000Z"),
          createdAt: new Date("2027-04-03T12:00:00.000Z"),
          acceptPath: "/signup?invite=test-token",
        },
      }),
    } as Response);

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    fireEvent.change(screen.getByLabelText("Invite assistant or co-planner"), { target: { value: "new-assistant@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create invite" }));

    expect(await screen.findByText("new-assistant@example.com")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/pro-planner/team/invites",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
