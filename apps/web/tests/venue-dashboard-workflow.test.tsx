import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/ui", () => ({
  Card: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => <div className={className}>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import { VenueDashboard } from "../src/components/venue/Dashboard";

const recentRequests = [
  {
    id: "request-new",
    createdAt: new Date("2027-04-01T10:00:00.000Z"),
    contactName: "Maya Client",
    contactEmail: "maya@example.com",
    contactPhone: "555-0101",
    startAt: new Date("2027-05-10T18:00:00.000Z"),
    endAt: new Date("2027-05-10T23:00:00.000Z"),
    guests: 180,
    status: "PENDING",
    message: "Can we tour the ballroom before placing a hold?",
    event: { id: "event-1", name: "Garden Gala", startAt: new Date("2027-05-10T18:00:00.000Z") },
    listing: { title: "Grand Ballroom" },
  },
  {
    id: "request-hold",
    createdAt: new Date("2027-03-28T10:00:00.000Z"),
    contactName: "Noah Planner",
    contactEmail: "noah@example.com",
    contactPhone: null,
    startAt: new Date("2027-04-22T18:00:00.000Z"),
    endAt: new Date("2027-04-22T23:00:00.000Z"),
    guests: 240,
    status: "HOLD",
    message: "Please confirm if the hold still works for our board dinner.",
    event: { id: "event-2", name: "Spring Fundraiser", startAt: new Date("2027-04-22T18:00:00.000Z") },
    listing: { title: "River Terrace" },
  },
];

const bookingContracts = [
  {
    id: "contract-1",
    title: "Garden Gala venue agreement",
    status: "IN_PAYMENT",
    proposal: {
      id: "proposal-1",
      currency: "USD",
      milestones: [
        {
          id: "milestone-1",
          title: "Venue deposit",
          amountCents: 500000,
          status: "PENDING",
          dueDate: new Date("2027-04-15T12:00:00.000Z"),
        },
      ],
    },
    event: { name: "Garden Gala", startAt: new Date("2027-05-10T18:00:00.000Z") },
  },
];

function renderDashboard(overrides: Partial<React.ComponentProps<typeof VenueDashboard>> = {}) {
  render(
    <VenueDashboard
      orgName="The Harbor Loft"
      orgSlug="the-harbor-loft"
      stats={{ todaysLeads: 1, upcomingEvents: 2, unreadMessages: 3 }}
      recentRequests={recentRequests}
      bookingContracts={bookingContracts}
      profileReadiness={{ hasSpaces: true, hasContact: true, hasAvailability: false, hasPaymentSetup: false }}
      {...overrides}
    />
  );
}

describe("VenueDashboard booking readiness workflow", () => {
  it("answers the first-screen venue inquiry, hold, tour, event date, and readiness questions", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "Venue booking command center" })).toBeInTheDocument();
    expect(screen.getByText("1 new inquiry")).toBeInTheDocument();
    expect(screen.getByText("1 hold/tour to confirm")).toBeInTheDocument();
    expect(screen.getByText(/Next event date: 4\/22\/2027.*Spring Fundraiser/i)).toBeInTheDocument();
    expect(screen.getByText(/Booking readiness: 1 manual payment milestone awaiting status/i)).toBeInTheDocument();
    expect(screen.getByText(/Next safe response: Reply to Maya Client about Grand Ballroom/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Respond in Leads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review booking readiness" })).toBeInTheDocument();
  });

  it("routes first-screen actions into useful venue surfaces instead of coming-soon placeholders", () => {
    const { container } = render(
      <VenueDashboard
        orgName="The Harbor Loft"
        orgSlug="the-harbor-loft"
        stats={{ todaysLeads: 0, upcomingEvents: 0, unreadMessages: 0 }}
        recentRequests={[]}
        bookingContracts={[]}
        profileReadiness={{ hasSpaces: false, hasContact: false, hasAvailability: false, hasPaymentSetup: false }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Respond in Leads" }));
    expect(screen.getByRole("heading", { name: "Leads & Booking Requests" })).toBeInTheDocument();
    expect(screen.getByText(/No active venue inquiries yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("heading", { name: "Calendar & Holds" })).toBeInTheDocument();
    expect(screen.getByText(/No upcoming venue holds, tours, or bookings/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(screen.getByRole("heading", { name: "Inquiry Messages" })).toBeInTheDocument();
    expect(screen.getByText(/Lead contact starts from venue booking requests/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Venue profile readiness" })).toBeInTheDocument();
    expect(screen.getByText(/Add venue spaces and capacity details/i)).toBeInTheDocument();

    expect(container).not.toHaveTextContent(/coming soon|placeholder|goes here/i);
  });

  it("wires visible inquiry hold and quote actions to the provider lead API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
    const promptMock = vi.spyOn(window, "prompt").mockReturnValue("5000");

    try {
      renderDashboard();
      fireEvent.click(screen.getByRole("button", { name: "Respond in Leads" }));

      fireEvent.click(screen.getAllByRole("button", { name: "Hold for tour" })[0]);
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/providers/leads/request-new", expect.objectContaining({ method: "PATCH" }));
      });
      expect(screen.getByText(/Inquiry held for tour\/follow-up; evidence was recorded/i)).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole("button", { name: "Send guarded quote" })[0]);
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/providers/leads/request-new", expect.objectContaining({ method: "POST" }));
      });
      expect(JSON.parse((fetchMock.mock.calls.at(-1)?.[1] as RequestInit).body as string)).toEqual(expect.objectContaining({ quoteCents: 500000 }));
    } finally {
      fetchMock.mockRestore();
      promptMock.mockRestore();
    }
  });

  it("shows the next future active venue date when a past active request is also present", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-04-01T12:00:00.000Z"));

    const pastActiveRequest = {
      id: "request-past-active",
      createdAt: new Date("2027-02-01T10:00:00.000Z"),
      contactName: "Priya Past",
      contactEmail: "priya@example.com",
      contactPhone: null,
      startAt: new Date("2027-03-15T18:00:00.000Z"),
      endAt: new Date("2027-03-15T23:00:00.000Z"),
      guests: 120,
      status: "HOLD",
      event: { id: "event-past", name: "Past Market Dinner", startAt: new Date("2027-03-15T18:00:00.000Z") },
      listing: { title: "Past hall" },
    };

    const futureActiveRequest = {
      id: "request-future-active",
      createdAt: new Date("2027-03-01T10:00:00.000Z"),
      contactName: "Felix Future",
      contactEmail: "felix@example.com",
      contactPhone: null,
      startAt: new Date("2027-04-20T18:00:00.000Z"),
      endAt: new Date("2027-04-20T23:00:00.000Z"),
      guests: 210,
      status: "HOLD",
      event: { id: "event-future", name: "Future Spring Gala", startAt: new Date("2027-04-20T18:00:00.000Z") },
      listing: { title: "Future ballroom" },
    };

    try {
      renderDashboard({ recentRequests: [pastActiveRequest, futureActiveRequest] });

      expect(screen.getByText(/Next event date: 4\/20\/2027.*Future Spring Gala/i)).toBeInTheDocument();
      expect(screen.queryByText(/Next event date: 3\/15\/2027.*Past Market Dinner/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an empty upcoming-date state instead of a stale past active venue date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-04-01T12:00:00.000Z"));

    const pastActiveRequest = {
      id: "request-past-active-only",
      createdAt: new Date("2027-02-01T10:00:00.000Z"),
      contactName: "Priya Past",
      contactEmail: "priya@example.com",
      contactPhone: null,
      startAt: new Date("2027-03-15T18:00:00.000Z"),
      endAt: new Date("2027-03-15T23:00:00.000Z"),
      guests: 120,
      status: "HOLD",
      event: { id: "event-past-only", name: "Past Market Dinner", startAt: new Date("2027-03-15T18:00:00.000Z") },
      listing: { title: "Past hall" },
    };

    try {
      renderDashboard({ recentRequests: [pastActiveRequest], stats: { todaysLeads: 0, upcomingEvents: 0, unreadMessages: 0 } });

      expect(screen.getByText(/No upcoming venue dates; keep availability current before accepting a new hold/i)).toBeInTheDocument();
      expect(screen.queryByText(/Next event date: 3\/15\/2027/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Open Calendar" }));
      expect(screen.getByRole("heading", { name: "Calendar & Holds" })).toBeInTheDocument();
      expect(screen.getByText(/No upcoming venue holds, tours, or bookings\. Keep availability current/i)).toBeInTheDocument();
      expect(screen.queryByText(/3\/15\/2027/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
