import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, sendEventSharedEmail } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  sendEventSharedEmail: vi.fn(),
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    eventShare: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/email.service", () => ({ sendEventSharedEmail }));

import { DELETE, POST } from "../src/app/api/events/[eventSlug]/share/route";

function params(eventSlug = "launch-gala") {
  return { params: Promise.resolve({ eventSlug }) };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("http://test.local/api/events/launch-gala/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

function deleteRequest(viewerUserId?: string) {
  const suffix = viewerUserId ? `?viewerUserId=${viewerUserId}` : "";
  return new Request(`http://test.local/api/events/launch-gala/share${suffix}`, {
    method: "DELETE",
  }) as never;
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    name: "Launch Gala",
    slug: "launch-gala",
    orgId: "org-1",
    createdById: "planner-1",
    org: { ownerId: "owner-1", members: [] },
    stakeholders: [{ userId: "client-1", role: "CLIENT" }],
    ...overrides,
  };
}

describe("event share access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.event.findFirst.mockResolvedValue(event());
    prisma.eventShare.findFirst.mockResolvedValue(null);
    prisma.eventShare.create.mockResolvedValue({ id: "share-1", eventId: "event-1", viewerUserId: "client-1", scope: "SUMMARY" });
    prisma.eventShare.delete.mockResolvedValue({ id: "share-1" });
    prisma.user.findUnique.mockResolvedValue({ email: "client@test.local", name: "Client One" });
    sendEventSharedEmail.mockResolvedValue(undefined);
  });

  it("requires authentication before sharing event content", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
    expect(prisma.eventShare.create).not.toHaveBeenCalled();
  });

  it.each(["CLIENT", "VENDOR", "VENUE", "EVENT_DREAMER"])("blocks %s from sharing event content", async (role) => {
    getCurrentUser.mockResolvedValueOnce({ id: "user-1", role });

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(403);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
  });

  it("blocks a planner who cannot manage the event", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-planner", role: "PRO_PLANNER" });
    prisma.event.findFirst.mockResolvedValueOnce(event());

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(403);
    expect(prisma.eventShare.create).not.toHaveBeenCalled();
  });

  it("requires the viewer to already be an event stakeholder before sharing", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER", name: "Planner One" });
    prisma.event.findFirst.mockResolvedValueOnce(event({ stakeholders: [] }));

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Viewer must be a stakeholder before content can be shared",
    });
    expect(prisma.eventShare.create).not.toHaveBeenCalled();
  });

  it("allows an event manager to share summary access with an existing stakeholder", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER", name: "Planner One" });

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(200);
    expect(prisma.eventShare.create).toHaveBeenCalledWith({
      data: {
        eventId: "event-1",
        viewerUserId: "client-1",
        scope: "SUMMARY",
        createdByUserId: "planner-1",
      },
    });
    expect(sendEventSharedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "client@test.local",
      clientName: "Client One",
      eventName: "Launch Gala",
      eventUrl: "http://localhost:3000/client/events/launch-gala",
      plannerName: "Planner One",
    }));
  });

  it("does not create a duplicate share when summary access already exists", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER", name: "Planner One" });
    prisma.eventShare.findFirst.mockResolvedValueOnce({ id: "share-1", eventId: "event-1", viewerUserId: "client-1", scope: "SUMMARY" });

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(200);
    expect(prisma.eventShare.create).not.toHaveBeenCalled();
    expect(sendEventSharedEmail).not.toHaveBeenCalled();
  });

  it("does not fail sharing when email notification fails after share creation", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "PRO_PLANNER", name: "Planner One" });
    sendEventSharedEmail.mockRejectedValueOnce(new Error("email failed"));

    const response = await POST(postRequest({ viewerUserId: "client-1", scope: "SUMMARY" }), params());

    expect(response.status).toBe(200);
    expect(prisma.eventShare.create).toHaveBeenCalled();
  });

  it("requires authentication before unsharing event content", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await DELETE(deleteRequest("client-1"), params());

    expect(response.status).toBe(401);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
    expect(prisma.eventShare.delete).not.toHaveBeenCalled();
  });

  it("blocks non-planners from unsharing event content", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "client-1", role: "CLIENT" });

    const response = await DELETE(deleteRequest("client-1"), params());

    expect(response.status).toBe(403);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
  });

  it("allows an event manager to unshare existing summary access", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "planner-1", role: "DIY_PLANNER" });
    prisma.eventShare.findFirst.mockResolvedValueOnce({ id: "share-1" });

    const response = await DELETE(deleteRequest("client-1"), params());

    expect(response.status).toBe(200);
    expect(prisma.eventShare.delete).toHaveBeenCalledWith({ where: { id: "share-1" } });
  });
});
