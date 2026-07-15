import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    eventStakeholder: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    eventShare: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { DELETE, POST } from "../src/app/api/events/[eventSlug]/stakeholders/route";

function params(eventSlug = "launch-gala") {
  return { params: Promise.resolve({ eventSlug }) };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("http://test.local/api/events/launch-gala/stakeholders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

function deleteRequest(userId?: string) {
  const suffix = userId ? `?userId=${userId}` : "";
  return new Request(`http://test.local/api/events/launch-gala/stakeholders${suffix}`, {
    method: "DELETE",
  }) as never;
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    slug: "launch-gala",
    orgId: "org-1",
    createdById: "planner-1",
    org: { ownerId: "owner-1", members: [] },
    ...overrides,
  };
}

describe("event stakeholder access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.event.findUnique.mockResolvedValue(event());
    prisma.eventStakeholder.create.mockResolvedValue({
      id: "stakeholder-1",
      userId: "client-1",
      role: "CLIENT",
      user: { id: "client-1", name: "Client One", email: "client@test.local" },
    });
    prisma.eventStakeholder.deleteMany.mockResolvedValue({ count: 1 });
    prisma.eventShare.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("requires authentication before adding a stakeholder", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(postRequest({ userId: "client-1", role: "CLIENT" }), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it.each(["CLIENT", "VENDOR", "VENUE", "EVENT_DREAMER"])("blocks %s from adding stakeholders", async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role });

    const response = await POST(postRequest({ userId: "client-1", role: "CLIENT" }), params());

    expect(response.status).toBe(403);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it("blocks a planner who does not manage the event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-planner", role: "PRO_PLANNER" });
    prisma.event.findUnique.mockResolvedValueOnce(event());

    const response = await POST(postRequest({ userId: "client-1", role: "CLIENT" }), params());

    expect(response.status).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects CLIENT stakeholders who are not members of the event org", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER" });
    prisma.user.findUnique.mockResolvedValueOnce({ id: "client-1", role: "CLIENT", memberships: [] });

    const response = await POST(postRequest({ userId: "client-1", role: "CLIENT" }), params());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Client must belong to the event organization before being added as a stakeholder",
    });
    expect(prisma.eventStakeholder.create).not.toHaveBeenCalled();
  });

  it("allows the creating planner to add a CLIENT stakeholder who belongs to the event org", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER" });
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "client-1",
      role: "CLIENT",
      memberships: [{ userId: "client-1" }],
    });

    const response = await POST(postRequest({ userId: "client-1", role: "CLIENT" }), params());

    expect(response.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "client-1" },
      select: expect.objectContaining({
        memberships: expect.objectContaining({ where: { orgId: "org-1" } }),
      }),
    }));
    expect(prisma.eventStakeholder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: "event-1",
        userId: "client-1",
        role: "CLIENT",
        addedByUserId: "planner-1",
      }),
    }));
  });

  it("requires authentication before removing a stakeholder", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await DELETE(deleteRequest("client-1"), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it("removes stakeholder access and related shares for an authorized event manager", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER" });

    const response = await DELETE(deleteRequest("client-1"), params());

    expect(response.status).toBe(200);
    expect(prisma.eventStakeholder.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event-1", userId: "client-1" },
    });
    expect(prisma.eventShare.deleteMany).toHaveBeenCalledWith({
      where: { eventId: "event-1", viewerUserId: "client-1" },
    });
  });
});
