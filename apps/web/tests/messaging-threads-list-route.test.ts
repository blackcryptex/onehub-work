import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    thread: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { GET } from "../src/app/api/messages/threads/route";

const request = () => new Request("http://test.local/api/messages/threads") as never;

describe("internal message thread list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", email: "planner@test.local", role: "PRO_PLANNER" });
    prisma.thread.findMany.mockResolvedValue([
      {
        id: "thread-1",
        subject: "Venue hold — Grand Hall",
        createdAt: new Date("2027-01-01T00:00:00.000Z"),
        participants: [{ userId: "planner-1", email: "planner@test.local", roleHint: "PRO_PLANNER" }],
        messages: [{ id: "msg-1", bodyMd: "Can you confirm the hold?", createdAt: new Date("2027-01-01T01:00:00.000Z"), senderId: "venue-1" }],
        event: { id: "event-1", name: "Community Gala" },
        listing: { id: "listing-1", title: "Grand Hall" },
        org: { id: "org-1", name: "Grand Venue", ownerId: "venue-1", members: [] },
      },
    ]);
  });

  it("requires authentication", async () => {
    getCurrentUser.mockResolvedValueOnce(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(prisma.thread.findMany).not.toHaveBeenCalled();
  });

  it("returns only threads the current event-community user participates in or owns", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.threads).toEqual([
      expect.objectContaining({
        id: "thread-1",
        subject: "Venue hold — Grand Hall",
        contextLabel: "Community Gala · Grand Hall",
        lastMessagePreview: "Can you confirm the hold?",
      }),
    ]);
    expect(prisma.thread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { participants: { some: { userId: "planner-1" } } },
            { participants: { some: { email: "planner@test.local" } } },
            { org: { ownerId: "planner-1" } },
            { org: { members: { some: { userId: "planner-1" } } } },
          ],
        },
      }),
    );
  });
});
