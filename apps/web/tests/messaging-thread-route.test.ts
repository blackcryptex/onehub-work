import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    thread: { findUnique: vi.fn() },
    message: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { GET, POST } from "../src/app/api/messages/threads/[threadId]/route";

function params(threadId = "thread-1") {
  return { params: Promise.resolve({ threadId }) };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("http://test.local/api/messages/threads/thread-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const thread = {
  id: "thread-1",
  orgId: "org-1",
  subject: "Booking request: Catering",
  participants: [
    { userId: "vendor-1", email: "vendor@test.local", roleHint: "VENDOR" },
    { userId: "client-1", email: "client@test.local", roleHint: "CLIENT" },
  ],
  messages: [{ id: "msg-1", bodyMd: "Hello", senderId: "client-1", createdAt: new Date("2027-01-01T00:00:00.000Z") }],
  org: { ownerId: "vendor-1", members: [] },
};

describe("internal message thread route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "vendor-1", email: "vendor@test.local", role: "VENDOR" });
    prisma.thread.findUnique.mockResolvedValue(thread);
    prisma.message.create.mockResolvedValue({ id: "msg-2", threadId: "thread-1", senderId: "vendor-1", bodyMd: "Reply", attachments: [] });
  });

  it("returns a thread only to a participant", async () => {
    const response = await GET(new Request("http://test.local/api/messages/threads/thread-1") as never, params());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      thread: {
        ...thread,
        messages: [{ ...thread.messages[0], createdAt: "2027-01-01T00:00:00.000Z" }],
      },
    });
  });

  it("rejects non-participants", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-user", email: "other@test.local", role: "CLIENT" });

    const response = await GET(new Request("http://test.local/api/messages/threads/thread-1") as never, params());

    expect(response.status).toBe(403);
  });

  it("persists a new message from an authorized participant", async () => {
    const response = await POST(postRequest({ bodyMd: "Reply" }), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message.id).toBe("msg-2");
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { threadId: "thread-1", senderId: "vendor-1", bodyMd: "Reply", attachments: [] },
    });
  });
});
