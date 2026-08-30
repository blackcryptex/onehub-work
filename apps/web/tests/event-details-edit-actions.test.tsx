import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { push, requireAuthorizedEventBySlug, getCurrentUser, canEditEvent, canDeleteEvent, prisma, recordActivity } = vi.hoisted(() => ({
  push: vi.fn(),
  requireAuthorizedEventBySlug: vi.fn(),
  getCurrentUser: vi.fn(),
  canEditEvent: vi.fn(),
  canDeleteEvent: vi.fn(),
  prisma: {
    event: { findFirst: vi.fn(), update: vi.fn() },
  },
  recordActivity: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement, props as Record<string, unknown>);
      }
      return <button {...props}>{children}</button>;
    },
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: ({ children, ...props }: { children?: React.ReactNode } & React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
  };
});
vi.mock("@/lib/event-access", () => ({ requireAuthorizedEventBySlug }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({
  canEditEvent,
  canDeleteEvent,
  canViewEvent: vi.fn(() => true),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { EventActions } from "../src/components/events/EventActions";
import { EventMoreActions } from "../src/components/events/EventMoreActions";
import EventSettings from "../src/app/(app)/events/[eventSlug]/settings/page";
import { PATCH } from "../src/app/api/events/[eventSlug]/route";

describe("event details edit and more actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", email: "planner@test.local" });
    canEditEvent.mockReturnValue(true);
    canDeleteEvent.mockReturnValue(true);
    requireAuthorizedEventBySlug.mockResolvedValue({
      user: { id: "planner-1", role: "PRO_PLANNER" },
      event: {
        id: "event-1",
        name: "Scout Gala",
        slug: "scout-gala",
        eventTypeRaw: "Fundraiser",
        startAt: new Date("2027-05-01T18:00:00.000Z"),
        endAt: new Date("2027-05-01T22:00:00.000Z"),
        venueCity: "Austin",
        venueState: "TX",
        guestTarget: 150,
        budgetRaw: "$25,000",
        objective: "Raise funds",
        description: "Black tie style",
        status: "PLANNING",
      },
    });
  });

  it("routes the visible edit event details button to the event settings form", () => {
    render(
      <EventActions
        role="PRO_PLANNER"
        eventSlug="scout-gala"
        eventId="event-1"
        eventName="Scout Gala"
        canEdit
        canDelete={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit event details/i }));

    expect(push).toHaveBeenCalledWith("/events/scout-gala/settings");
  });

  it("opens a real More menu with share, export, and print actions", async () => {
    const print = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "print", { configurable: true, value: print });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    render(
      <EventMoreActions
        eventSlug="scout-gala"
        eventName="Scout Gala"
        eventDate="2027-05-01T18:00:00.000Z"
        eventLocation="Austin, TX"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /more event actions/i }));

    expect(screen.getByRole("button", { name: /share event link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export event details/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /print event page/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /share event link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/pro/planner/vault/scout-gala")));

    fireEvent.click(screen.getByRole("button", { name: /print event page/i }));
    expect(print).toHaveBeenCalled();
  });

  it("renders event settings as a real edit form for date and core details", async () => {
    const page = await EventSettings({ params: Promise.resolve({ eventSlug: "scout-gala" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Edit event details");
    expect(html).toContain("Event date");
    expect(html).toContain("Event name");
    expect(html).toContain("Guest count");
    expect(html).toContain("Budget");
    expect(html).toContain("Save event details");
    expect(html).not.toContain("instead of exposing incomplete edit controls");
  });

  it("updates core event details through the authorized event API", async () => {
    const event = {
      id: "event-1",
      orgId: "org-1",
      createdById: "planner-1",
      name: "Scout Gala",
      slug: "scout-gala",
      org: { ownerId: "planner-1", members: [{ userId: "planner-1" }] },
    };
    prisma.event.findFirst.mockResolvedValue(event);
    prisma.event.update.mockResolvedValue({ ...event, name: "Updated Gala", startAt: new Date("2027-06-01T18:00:00.000Z") });

    const response = await PATCH(
      new Request("http://test.local/api/events/scout-gala", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Gala",
          eventTypeRaw: "Gala",
          date: "2027-06-01",
          city: "Atlanta",
          state: "GA",
          headcount: "200",
          budgetRaw: "$40,000",
          objective: "Celebrate donors",
          style: "Formal",
          status: "ACTIVE",
        }),
      }) as never,
      { params: Promise.resolve({ eventSlug: "scout-gala" }) },
    );

    expect(response.status).toBe(200);
    expect(prisma.event.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "event-1" },
      data: expect.objectContaining({
        name: "Updated Gala",
        eventTypeRaw: "Gala",
        venueCity: "Atlanta",
        venueState: "GA",
        guestTarget: 200,
        budgetRaw: "$40,000",
        objective: "Celebrate donors",
        description: "Formal",
        status: "ACTIVE",
      }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "EVENT_UPDATED" }));
  });
});
