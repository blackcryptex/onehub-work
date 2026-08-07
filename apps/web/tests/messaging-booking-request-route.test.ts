import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  prisma: {
    bookingRequest: { findUnique: vi.fn() },
    thread: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    message: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user: { role?: string } | null | undefined) => user?.role === "ADMIN",
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "../src/app/api/messages/threads/from-booking-request/route";

function request(body: Record<string, unknown>) {
  return new Request("http://test.local/api/messages/threads/from-booking-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const bookingRequest = {
  id: "request-1",
  contactName: "Avery Client",
  contactEmail: "avery@example.com",
  message: "Can we talk about the menu?",
  eventId: "event-1",
  listingId: "listing-1",
  event: { id: "event-1", name: "Scout Gala" },
  listing: {
    id: "listing-1",
    title: "Full-service catering",
    orgId: "vendor-org-1",
    org: {
      id: "vendor-org-1",
      name: "Scout Catering",
      ownerId: "vendor-owner-1",
      members: [{ userId: "vendor-owner-1", user: { id: "vendor-owner-1", email: "owner@vendor.test" } }],
    },
  },
};

describe("booking request internal message thread route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "vendor-owner-1", email: "owner@vendor.test", role: "VENDOR" });
    prisma.bookingRequest.findUnique.mockResolvedValue(bookingRequest);
    prisma.thread.findFirst.mockResolvedValue(null);
    prisma.thread.create.mockResolvedValue({ id: "thread-1" });
    prisma.thread.findUnique.mockResolvedValue({ id: "thread-1", subject: "Booking request: Full-service catering" });
    prisma.user.findUnique.mockResolvedValue(null);
  });

  it("creates a OneHub thread from a vendor booking request with vendor and client participants", async () => {
    const response = await POST(request({ bookingRequestId: "request-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.thread.id).toBe("thread-1");
    expect(prisma.thread.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: "vendor-org-1",
        eventId: "event-1",
        listingId: "listing-1",
        subject: "Booking request: Full-service catering — Scout Gala",
        participants: {
          create: expect.arrayContaining([
            { email: "owner@vendor.test", userId: "vendor-owner-1", roleHint: "VENDOR" },
            { email: "avery@example.com", userId: undefined, roleHint: "CLIENT" },
          ]),
        },
      }),
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        threadId: "thread-1",
        senderId: undefined,
        bodyMd: "Can we talk about the menu?",
        attachments: [],
      },
    });
  });

  it("rejects users who are not attached to the vendor organization", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "other-vendor", email: "other@test.local", role: "VENDOR" });

    const response = await POST(request({ bookingRequestId: "request-1" }));

    expect(response.status).toBe(403);
    expect(prisma.thread.create).not.toHaveBeenCalled();
  });
});
