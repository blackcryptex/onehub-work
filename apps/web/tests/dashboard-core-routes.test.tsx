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

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
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
vi.mock("@/components/messages/MessageThreadReplyPanel", () => ({
  MessageThreadReplyPanel: ({ canReply, messages }: { canReply: boolean; messages: { bodyMd: string }[] }) => (
    <div aria-label="Canonical reply panel">
      {messages.map((message) => <span key={message.bodyMd}>{message.bodyMd}</span>)}
      {canReply ? <button>Send</button> : <p>Read-only</p>}
    </div>
  ),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("not-found");
  }),
  useRouter: () => ({ refresh: vi.fn() }),
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

function inboxThread(overrides: Record<string, unknown> = {}) {
  return {
    id: "thread-1",
    orgId: "org-1",
    visibility: "CLIENT_VISIBLE",
    subject: "Readable planning update",
    org: { name: "Atlas Events", ownerId: "owner-1", members: [{ userId: "planner-1" }] },
    event: null,
    listing: null,
    proposal: null,
    participants: [{ email: "client@example.com", roleHint: "CLIENT", userId: "client-1" }],
    messages: [{ id: "message-1", bodyMd: "Visible client update", createdAt: new Date("2027-04-05T12:00:00.000Z"), senderId: "planner-1" }],
    createdAt: new Date("2027-04-05T12:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.GOOGLE_ID = "test-google-client-id";
  process.env.GOOGLE_SECRET = "test-google-client-secret";
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
    orgId: "org-1",
    visibility: "CLIENT_VISIBLE",
    subject: "Proposal Discussion",
    resourceType: "EVENT_TASK",
    resourceId: "task-1",
    org: { name: "Atlas Events", ownerId: "owner-1", members: [{ userId: "planner-1" }] },
    event: {
      name: "Sample Wedding",
      slug: "sample-wedding",
      orgId: "org-1",
      createdById: "planner-1",
      org: { ownerId: "owner-1", members: [{ userId: "planner-1" }] },
      shares: [],
      stakeholders: [],
    },
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
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    expect(screen.getByText(/task-1/i)).toBeInTheDocument();
    expect(findThread).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "thread-1" } }));
    expect(document.body.textContent).not.toMatch(forbiddenPlaceholderCopy);
  });

  it("keeps admin /messages list and /messages/[threadId] detail access in parity", async () => {
    getCurrentUser.mockResolvedValue({ id: "admin-1", role: "ADMIN", name: "Admin", email: "admin@example.com" });
    findThreads.mockResolvedValue([{ id: "thread-1", subject: "Proposal Discussion", org: { name: "Atlas Events" }, event: null, listing: null, proposal: null, participants: [], messages: [] }]);
    const { default: MessagesPage } = await import("../src/app/(app)/messages/page");
    const { default: MessageThreadPage } = await import("../src/app/(app)/messages/[threadId]/page");

    render(await MessagesPage());
    expect(screen.getByRole("link", { name: /proposal discussion/i })).toHaveAttribute("href", "/messages/thread-1");
    expect(findThreads).toHaveBeenCalledWith(expect.objectContaining({ where: { org: { is: {} } } }));

    render(await MessageThreadPage({ params: Promise.resolve({ threadId: "thread-1" }) }));
    expect(screen.getByRole("heading", { name: /proposal discussion/i })).toBeInTheDocument();
    expect(findThread).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: "thread-1" } }));
  });

  it("hides internal thread inbox previews from client participants while preserving readable client threads", async () => {
    getCurrentUser.mockResolvedValue({ id: "client-1", role: "CLIENT", name: "Client", email: "client@example.com" });
    findThreads.mockResolvedValue([
      inboxThread({
        id: "internal-thread",
        visibility: "INTERNAL",
        subject: "Internal client risk review",
        participants: [{ email: "client@example.com", roleHint: "CLIENT", userId: "client-1" }],
        messages: [{ id: "message-internal", bodyMd: "Do not disclose this internal note", createdAt: new Date("2027-04-06T12:00:00.000Z"), senderId: "planner-1" }],
      }),
      inboxThread({
        id: "client-visible-thread",
        visibility: "CLIENT_VISIBLE",
        subject: "Client visible update",
        messages: [{ id: "message-visible", bodyMd: "Floor plan is ready for your review", createdAt: new Date("2027-04-05T12:00:00.000Z"), senderId: "planner-1" }],
      }),
    ]);
    const { default: MessagesPage } = await import("../src/app/(app)/messages/page");

    render(await MessagesPage());

    expect(screen.queryByText(/Internal client risk review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Do not disclose this internal note/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Client visible update/i })).toHaveAttribute("href", "/messages/client-visible-thread");
    expect(screen.getByText(/Floor plan is ready for your review/i)).toBeInTheDocument();
  });

  it("hides internal thread inbox previews from provider participants while preserving provider-visible threads", async () => {
    getCurrentUser.mockResolvedValue({ id: "provider-1", role: "VENDOR", name: "Vendor", email: "provider@example.com" });
    findThreads.mockResolvedValue([
      inboxThread({
        id: "provider-internal-thread",
        visibility: "INTERNAL",
        subject: "Internal vendor negotiation",
        participants: [{ email: "provider@example.com", roleHint: "VENDOR", userId: "provider-1" }],
        messages: [{ id: "message-provider-internal", bodyMd: "Internal margin note", createdAt: new Date("2027-04-06T12:00:00.000Z"), senderId: "planner-1" }],
      }),
      inboxThread({
        id: "provider-visible-thread",
        visibility: "PROVIDER_VISIBLE",
        subject: "Provider load-in details",
        participants: [{ email: "provider@example.com", roleHint: "VENDOR", userId: "provider-1" }],
        messages: [{ id: "message-provider-visible", bodyMd: "Please confirm your arrival window", createdAt: new Date("2027-04-05T12:00:00.000Z"), senderId: "planner-1" }],
      }),
    ]);
    const { default: MessagesPage } = await import("../src/app/(app)/messages/page");

    render(await MessagesPage());

    expect(screen.queryByText(/Internal vendor negotiation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal margin note/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Provider load-in details/i })).toHaveAttribute("href", "/messages/provider-visible-thread");
    expect(screen.getByText(/Please confirm your arrival window/i)).toBeInTheDocument();
  });

  it("hides internal thread inbox previews from unrelated listing-side users while preserving provider-side readable threads", async () => {
    getCurrentUser.mockResolvedValue({ id: "listing-member-1", role: "VENDOR", name: "Listing Team", email: "listing@example.com" });
    const listing = { title: "Rosewood Catering", type: "CATERER", orgId: "listing-org-1", org: { ownerId: "listing-owner-1", members: [{ userId: "listing-member-1" }] } };
    findThreads.mockResolvedValue([
      inboxThread({
        id: "listing-internal-thread",
        visibility: "INTERNAL",
        subject: "Internal listing-side review",
        listing,
        participants: [],
        messages: [{ id: "message-listing-internal", bodyMd: "Planner-only listing note", createdAt: new Date("2027-04-06T12:00:00.000Z"), senderId: "planner-1" }],
      }),
      inboxThread({
        id: "listing-provider-thread",
        visibility: "PROVIDER_VISIBLE",
        subject: "Provider-visible listing update",
        listing,
        participants: [],
        messages: [{ id: "message-listing-provider", bodyMd: "Provider-side details are ready", createdAt: new Date("2027-04-05T12:00:00.000Z"), senderId: "planner-1" }],
      }),
    ]);
    const { default: MessagesPage } = await import("../src/app/(app)/messages/page");

    render(await MessagesPage());

    expect(screen.queryByText(/Internal listing-side review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Planner-only listing note/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Provider-visible listing update/i })).toHaveAttribute("href", "/messages/listing-provider-thread");
    expect(screen.getByText(/Provider-side details are ready/i)).toBeInTheDocument();
  });

  it("preserves non-admin /messages/[threadId] isolation for unrelated users", async () => {
    getCurrentUser.mockResolvedValue({ id: "outsider-1", role: "PRO_PLANNER", name: "Outsider", email: "outsider@example.com" });
    findThread.mockResolvedValue({
      id: "thread-1",
      orgId: "org-1",
      visibility: "INTERNAL",
      subject: "Internal Thread",
      resourceType: null,
      resourceId: null,
      org: { name: "Atlas Events", ownerId: "owner-1", members: [{ userId: "planner-1" }] },
      event: null,
      listing: null,
      proposal: null,
      participants: [{ email: "client@example.com", roleHint: "CLIENT", userId: "client-1" }],
      messages: [],
    });
    const { default: MessageThreadPage } = await import("../src/app/(app)/messages/[threadId]/page");

    await expect(MessageThreadPage({ params: Promise.resolve({ threadId: "thread-1" }) })).rejects.toThrow("not-found");
    expect(findThread).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: "thread-1" } }));
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
