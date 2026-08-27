import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, canManageEvent, prisma } = vi.hoisted(() => {
  const mockPrisma = {
    activity: { findMany: vi.fn() },
    event: { findUnique: vi.fn() },
    payout: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  return {
    getCurrentUser: vi.fn(),
    canManageEvent: vi.fn(),
    prisma: mockPrisma,
  };
});

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));

import { POST } from "../src/app/api/payments/auto-build/route";

function request(body: Record<string, unknown>) {
  return new Request("http://onehub.test/api/payments/auto-build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const planner = { id: "planner-1", role: "PRO_PLANNER" };
const event = {
  id: "event-1",
  orgId: "org-1",
  org: { members: [{ userId: "planner-1" }] },
  proposals: [
    {
      id: "proposal-1",
      eventId: "event-1",
      orgId: "org-1",
      listingId: "listing-1",
      listing: { id: "listing-1" },
      status: "ACCEPTED",
      totalCents: 250000,
    },
  ],
};

describe("legacy payment auto-build provider evidence gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue(planner);
    canManageEvent.mockReturnValue(true);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.activity.findMany.mockResolvedValue([{ target: "proposal-1" }]);
    prisma.payout.findFirst.mockResolvedValue(null);
    prisma.payout.create.mockResolvedValue({ id: "payout-1" });
  });

  it("does not create payout lines from accepted listing-backed proposals without provider-submitted evidence", async () => {
    prisma.activity.findMany.mockResolvedValueOnce([]);

    const response = await POST(request({ eventId: "event-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "No accepted provider-backed proposals found for this event" });
    expect(prisma.activity.findMany).toHaveBeenCalledWith({
      where: {
        action: "PROVIDER_PROPOSAL_SUBMITTED",
        target: { in: ["proposal-1"] },
        eventId: "event-1",
        orgId: "org-1",
      },
      select: { target: true },
    });
    expect(prisma.payout.findFirst).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
  });

  it("still creates payout lines from accepted provider-submitted proposals", async () => {
    const response = await POST(request({ eventId: "event-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      created: { deposits: 0, payouts: 1 },
      message: "Created 1 payout line(s) from accepted proposals",
    });
    expect(prisma.payout.create).toHaveBeenCalledWith({
      data: {
        proposalId: "proposal-1",
        listingId: "listing-1",
        orgId: "org-1",
        amountCents: 250000,
        status: "PENDING",
      },
    });
  });
});
