import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const getCurrentUser = vi.fn();
const auth = vi.fn();
const findOrganizations = vi.fn();
const findCalendarEvents = vi.fn();
const findThreads = vi.fn();
const findNotifications = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findMany: findOrganizations },
    calendarEvent: { findMany: findCalendarEvents },
    thread: { findMany: findThreads },
  },
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
}));

const forbiddenPlaceholderCopy = /coming soon|placeholder|stub|mock-only|content for/i;

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", name: "Pro Planner" });
  auth.mockResolvedValue({ user: { id: "planner-1", role: "PRO_PLANNER" } });
  findOrganizations.mockResolvedValue([{ id: "org-1", name: "Atlas Events" }]);
  findCalendarEvents.mockResolvedValue([]);
  findThreads.mockResolvedValue([]);
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

    render(await CalendarPage());

    expect(screen.getByRole("heading", { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByText(/Pro planner calendar overview/i)).toBeInTheDocument();
    expect(screen.getByText(/No upcoming calendar items are loaded/i)).toBeInTheDocument();
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
