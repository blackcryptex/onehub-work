import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, recordActivity } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  recordActivity: vi.fn(),
  prisma: {
    event: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));

import { DELETE, GET } from "../src/app/api/events/[eventSlug]/route";

function params(eventSlug = "launch-gala") {
  return { params: Promise.resolve({ eventSlug }) };
}

function request(method: "GET" | "DELETE" = "GET") {
  return new Request("http://test.local/api/events/launch-gala", { method }) as never;
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    slug: "launch-gala",
    orgId: "org-1",
    createdById: "planner-1",
    org: { ownerId: "owner-1", members: [] },
    stakeholders: [],
    shares: [],
    ...overrides,
  };
}

describe("event read/delete access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.event.delete.mockResolvedValue({ id: "event-1" });
    recordActivity.mockResolvedValue(undefined);
  });

  it("requires authentication before reading an event", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(request(), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
  });

  it("allows the creating planner to read their event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER" });
    prisma.event.findFirst.mockResolvedValueOnce(event());

    const response = await GET(request(), params());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: "event-1" });
  });

  it("blocks vendors from reading planner events by default", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "vendor-1", role: "VENDOR" });
    prisma.event.findFirst.mockResolvedValueOnce(event());

    const response = await GET(request(), params());

    expect(response.status).toBe(403);
  });

  it("allows a client to read only when stakeholder access and summary share both exist", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    prisma.event.findFirst.mockResolvedValueOnce(event({
      stakeholders: [{ userId: "client-1", role: "CLIENT" }],
      shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
    }));

    const response = await GET(request(), params());

    expect(response.status).toBe(200);
  });

  it("blocks a client stakeholder when summary share is missing", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });
    prisma.event.findFirst.mockResolvedValueOnce(event({
      stakeholders: [{ userId: "client-1", role: "CLIENT" }],
      shares: [],
    }));

    const response = await GET(request(), params());

    expect(response.status).toBe(403);
  });

  it("requires authentication before deleting an event", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await DELETE(request("DELETE"), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it("blocks clients before lookup when deleting an event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });

    const response = await DELETE(request("DELETE"), params());

    expect(response.status).toBe(403);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it("blocks unauthorized users from deleting an event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "venue-1", role: "VENUE" });
    prisma.event.findFirst.mockResolvedValueOnce(event());

    const response = await DELETE(request("DELETE"), params());

    expect(response.status).toBe(403);
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it("allows the creating planner to delete their event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER" });
    prisma.event.findFirst.mockResolvedValueOnce(event());

    const response = await DELETE(request("DELETE"), params());

    expect(response.status).toBe(200);
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "EVENT_DELETED",
      actorId: "planner-1",
      eventId: "event-1",
    }));
    expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: "event-1" } });
  });
});
