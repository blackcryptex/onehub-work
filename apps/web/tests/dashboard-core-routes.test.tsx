import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const getCurrentUser = vi.fn();
const auth = vi.fn();
const findOrganizations = vi.fn();
const findCalendarEvents = vi.fn();
const createCalendarEvent = vi.fn();
const findCalendarAccount = vi.fn();
const findOrg = vi.fn();
const findEvents = vi.fn();
const findEvent = vi.fn();
const findThreads = vi.fn();
const findThread = vi.fn();
const findNotifications = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findMany: findOrganizations, findFirst: findOrg },
    event: { findMany: findEvents, findFirst: findEvent },
    calendarEvent: { findMany: findCalendarEvents, create: createCalendarEvent },
    calendarAccount: { findFirst: findCalendarAccount },
    thread: { findMany: findThreads, findFirst: findThread },
  },
}));
vi.mock("@/lib/google.calendar", () => ({
  ensureOneHubCalendar: vi.fn(),
  pullMappedGoogleCalendarEvents: vi.fn(),
  pushOneHubCalendarEvents: vi.fn(),
  syncOneHubCalendarEventToGoogle: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  db: {
    notification: { findMany: findNotifications },
  },
}));
vi.mock("next/navigation", () => ({
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
vi.mock("@onehub/ui", () => ({
  CalendarView: ({ events }: { events: { title: string }[] }) => (
    <div aria-label="Calendar grid">{events.map((event) => <span key={event.title}>{event.title}</span>)}</div>
  ),
  ThreadPanel: ({ messages }: { messages: { bodyMd: string }[] }) => (
    <div aria-label="Thread messages">{messages.map((message) => <span key={message.bodyMd}>{message.bodyMd}</span>)}</div>
  ),
}));

const forbiddenPlaceholderCopy = /coming soon|placeholder|stub|mock-only|content for/i;

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", name: "Pro Planner" });
  auth.mockResolvedValue({ user: { id: "planner-1", role: "PRO_PLANNER" } });
  findOrganizations.mockResolvedValue([{ id: "org-1", name: "Atlas Events" }]);
  findOrg.mockResolvedValue({ id: "org-1" });
  findEvents.mockResolvedValue([{ id: "event-1", name: "Sample Wedding", orgId: "org-1" }]);
  findEvent.mockResolvedValue({ id: "event-1" });
  findCalendarEvents.mockResolvedValue([]);
  findCalendarAccount.mockResolvedValue(null);
  createCalendarEvent.mockResolvedValue({ id: "calendar-1" });
  findThreads.mockResolvedValue([]);
  findThread.mockResolvedValue({
    id: "thread-1",
    subject: "Proposal Discussion",
    org: { name: "Atlas Events" },
    event: { name: "Sample Wedding", slug: "sample-wedding" },
    listing: null,
    proposal: null,
    participants: [{ email: "client@example.com", roleHint: "CLIENT" }],
    messages: [{ id: "message-1", bodyMd: "Please confirm the floor plan.", createdAt: new Date("2027-04-05T12:00:00.000Z"), senderId: "planner-1" }],
  });
  findNotifications.mockResolvedValue([]);
});

describe("core dashboard destination routes", () => {
  it("renders /messages as a useful role-aware inbox empty state instead of app 404", async () => {
    const { default: MessagesPage } = await import("../src/app/(app)/messages/page");

    render(await MessagesPage());

    expect(screen.getByRole("heading", { name: /message inbox/i })).toBeInTheDocument();
    expect(screen.getByText(/pro planner/i)).toBeInTheDocument();
    expect(screen.getByText(/No message threads need your attention/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("renders /calendar as an upcoming calendar overview with a truthful empty state", async () => {
    const { default: CalendarPage } = await import("../src/app/(app)/calendar/page");

    render(await CalendarPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /^calendar$/i })).toBeInTheDocument();
    expect(screen.getByText(/Pro planner calendar overview/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add calendar item/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add calendar item/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /google calendar sync/i })).toBeInTheDocument();
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connect google calendar/i })).toBeInTheDocument();
    expect(screen.getByText(/If Google Calendar is connected/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming calendar items are loaded/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("renders /messages/[threadId] as a real readable thread instead of a broken client handoff", async () => {
    const { default: MessageThreadPage } = await import("../src/app/(app)/messages/[threadId]/page");

    render(await MessageThreadPage({ params: Promise.resolve({ threadId: "thread-1" }) }));

    expect(screen.getByRole("heading", { name: /proposal discussion/i })).toBeInTheDocument();
    expect(screen.getByText(/Back to Message Inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Please confirm the floor plan/i)).toBeInTheDocument();
    expect(findThread).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "thread-1",
        org: { members: { some: { userId: "planner-1" } } },
      }),
    }));
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("renders /notifications as a useful notification center with a truthful empty state", async () => {
    const { default: NotificationsPage } = await import("../src/app/(app)/notifications/page");

    render(await NotificationsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/notification center/i)).toBeInTheDocument();
    expect(screen.getByText(/No notifications match this view/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });
});
