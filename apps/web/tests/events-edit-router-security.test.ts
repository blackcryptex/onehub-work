import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, recordActivity } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  recordActivity: vi.fn(),
  prisma: {
    event: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));

import { eventRouter } from "../src/server/routers/event";

function caller() {
  return eventRouter.createCaller({});
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    orgId: "org-1",
    createdById: "planner-1",
    name: "Launch Gala",
    slug: "launch-gala",
    status: "PLANNING",
    org: {
      ownerId: "owner-1",
      members: [],
    },
    ...overrides,
  };
}

describe("event router edit/status access guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.event.findUniqueOrThrow.mockResolvedValue(event());
    prisma.event.update.mockResolvedValue(event({ name: "Updated Gala", status: "ACTIVE" }));
    recordActivity.mockResolvedValue(undefined);
  });

  it("requires authentication before updating an event", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    await expect(caller().update({
      eventId: "event-1",
      data: { name: "Updated Gala" },
    })).rejects.toThrow("Unauthorized");

    expect(prisma.event.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it.each(["CLIENT", "VENDOR", "VENUE", "EVENT_DREAMER"])("blocks %s from updating event details", async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role });

    await expect(caller().update({
      eventId: "event-1",
      data: { name: "Updated Gala" },
    })).rejects.toThrow("Forbidden");

    expect(prisma.event.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "event-1" },
      include: { org: { include: { members: true } } },
    });
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("allows the creating planner to update permitted event fields and records activity", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER" });
    const startAt = new Date("2027-05-01T18:00:00.000Z");

    await expect(caller().update({
      eventId: "event-1",
      data: { name: "Updated Gala", startAt, guestTarget: 150 },
    })).resolves.toEqual(expect.objectContaining({ id: "event-1" }));

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { name: "Updated Gala", startAt, guestTarget: 150 },
    });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org-1",
      eventId: "event-1",
      actorId: "planner-1",
      action: "EVENT_UPDATED",
      target: "event-1",
      meta: {
        name: "Updated Gala",
        startAt: "2027-05-01T18:00:00.000Z",
        guestTarget: 150,
      },
    }));
  });

  it("requires edit access before changing event status", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "venue-1", role: "VENUE" });

    await expect(caller().setStatus({
      eventId: "event-1",
      status: "ACTIVE",
    })).rejects.toThrow("Forbidden");

    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("allows the creating planner to change event status and records activity", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER" });

    await expect(caller().setStatus({
      eventId: "event-1",
      status: "ACTIVE",
    })).resolves.toEqual(expect.objectContaining({ id: "event-1" }));

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { status: "ACTIVE" },
    });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org-1",
      eventId: "event-1",
      actorId: "planner-1",
      action: "EVENT_STATUS_SET",
      target: "event-1",
      meta: { status: "ACTIVE" },
    }));
  });
});
