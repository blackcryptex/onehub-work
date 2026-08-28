import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => {
  const mockPrisma = {
    invitation: { findUnique: vi.fn(), update: vi.fn() },
    guest: { count: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    guestList: { update: vi.fn() },
  } as any;
  return { prisma: mockPrisma };
});

vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "../src/app/api/rsvp/[token]/route";

function request(body: unknown) {
  return new Request("http://onehub.test/api/rsvp/token-1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ token: "token-1" }) };

describe("public RSVP API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.invitation.findUnique.mockResolvedValue({
      id: "invitation-1",
      guest: {
        id: "guest-1",
        guestListId: "guest-list-1",
        guestList: { id: "guest-list-1" },
      },
    });
    prisma.guest.update.mockResolvedValue({ id: "guest-1", status: "ACCEPTED" });
    prisma.guest.count.mockResolvedValue(3);
    prisma.invitation.update.mockResolvedValue({ id: "invitation-1" });
    prisma.guestList.update.mockResolvedValue({ id: "guest-list-1", rsvped: 3 });
  });

  it("records an accepted RSVP and updates the guest-list count", async () => {
    const response = await POST(request({ status: "ACCEPTED", dietary: "Vegetarian", notes: "Aisle seat" }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ success: true, guestId: "guest-1", status: "ACCEPTED", rsvpCount: 3 }));
    expect(prisma.guest.update).toHaveBeenCalledWith({
      where: { id: "guest-1" },
      data: { status: "ACCEPTED", dietary: "Vegetarian", notes: "Aisle seat" },
    });
    expect(prisma.invitation.update).toHaveBeenCalledWith({
      where: { id: "invitation-1" },
      data: { respondedAt: expect.any(Date) },
    });
    expect(prisma.guest.count).toHaveBeenCalledWith({
      where: { guestListId: "guest-list-1", status: { in: ["ACCEPTED", "DECLINED"] } },
    });
    expect(prisma.guestList.update).toHaveBeenCalledWith({
      where: { id: "guest-list-1" },
      data: { rsvped: 3 },
    });
  });

  it("returns not found for an unknown token", async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    const response = await POST(request({ status: "DECLINED" }), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Invitation not found" });
  });
});
