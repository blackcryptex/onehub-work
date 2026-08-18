import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { infoToast, successToast, errorToast, routerPush } = vi.hoisted(() => ({
  infoToast: vi.fn(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/diy-planner",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "diy-1", role: "DIY_PLANNER" } } }),
}));

vi.mock("../src/components/diy-planner/Header", () => ({
  Header: ({ onMenuClick }: { onMenuClick: () => void }) => (
    <header>
      DIY header
      <button onClick={onMenuClick}>Open menu</button>
    </header>
  ),
}));

vi.mock("@/components/ui", () => {
  return {
    Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  };
});

vi.mock("@/components/EventManagementSection", () => ({
  default: ({ initialTab }: { initialTab: string }) => (
    <section aria-label="event management">Event management tab: {initialTab}</section>
  ),
}));

vi.mock("@/components/panes/CalendarPane", () => ({
  default: () => <section>Calendar cockpit</section>,
}));

vi.mock("@/components/event-wizard/EventWizard", () => ({
  EventWizard: () => <section>Event wizard</section>,
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ success: successToast, error: errorToast, info: infoToast }),
}));

import { DIYPlannerDashboard } from "../src/components/diy-planner/Dashboard";

const diyEvent = {
  id: "event-1",
  slug: "scout-gala",
  name: "Scout Gala",
  date: "2027-05-01T18:00:00.000Z",
  location: "Atlanta, GA",
  description: "Private planning test event",
  progress: 35,
  budget: { total: 12000, spent: 3000 },
  city: "Atlanta",
  vendors: [{ id: "vendor-1", name: "Avery Florals", category: "florist", secured: false, shortlisted: true }],
  proposals: [{ id: "proposal-1", vendorName: "Avery Florals", amount: 2500, status: "sent" }],
  contracts: [{ id: "contract-1", counterparty: "Avery Florals", status: "sent" }],
  guests: [{ name: "Maya Client", email: "maya@example.com", rsvp: "yes" }],
  tasks: [{ id: "task-1", title: "Confirm venue floorplan", due: "2027-04-20T12:00:00.000Z", done: false }],
  milestones: [{ id: "milestone-1", title: "Deposit due", due: "2027-04-15T12:00:00.000Z", status: "pending" }],
};

function mockEventsResponse(events = [diyEvent]) {
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ events }),
  } as Response);
}

describe("DIYPlannerDashboard cockpit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventsResponse();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a guided dream-plan-book-track flow in the first screen", async () => {
    render(<DIYPlannerDashboard />);

    await waitFor(() => expect(screen.getAllByText("Scout Gala").length).toBeGreaterThan(0));

    expect(screen.getByRole("heading", { name: "Dream, plan, book, track" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dream up event" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create event" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add needs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find vendors/venue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare proposals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Track contracts/payment readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
  });

  it("turns top-flow steps into clear dashboard routes instead of generic placeholder panels", async () => {
    const { container } = render(<DIYPlannerDashboard />);

    await waitFor(() => expect(screen.getAllByText("Scout Gala").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Find vendors/venue" }));
    expect(screen.getByText("Event management tab: vendors")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compare proposals" }));
    expect(screen.getByText("Event management tab: proposals")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Track contracts/payment readiness" }));
    expect(screen.getByText("Event management tab: contracts")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Content for .* goes here|placeholder|coming soon/i);
  });

  it("makes Share a safe user-visible action instead of console-only behavior", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    render(<DIYPlannerDashboard />);

    await waitFor(() => expect(screen.getAllByText("Scout Gala").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "Open Scout Gala" }));

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(consoleSpy).not.toHaveBeenCalledWith("Share link");
    expect(infoToast).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Sharing is not connected yet" })).toBeInTheDocument();
    expect(screen.getByText(/No private share or access-control flow is wired/i)).toBeInTheDocument();
    expect(screen.queryByText(/Event actions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invite or manage access safely/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens a real Messages empty state instead of only showing a toast", async () => {
    render(<DIYPlannerDashboard />);

    await waitFor(() => expect(screen.getAllByText("Scout Gala").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));

    expect(infoToast).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "No message thread connected yet" })).toBeInTheDocument();
    expect(screen.getByText(/OneHub has proposal and contract thread surfaces/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review proposals" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review contracts" })).toBeInTheDocument();
  });
});
