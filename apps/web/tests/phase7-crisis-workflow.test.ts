import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, canManageEvent, recordActivity } = vi.hoisted(() => {
  const prisma = {
    event: { findUnique: vi.fn() },
    listing: { findUnique: vi.fn() },
    bookingRequest: { create: vi.fn() },
    crisisIssue: { create: vi.fn(), findMany: vi.fn() },
    task: { create: vi.fn() },
  };
  return {
    getCurrentUser: vi.fn(),
    prisma,
    canManageEvent: vi.fn(),
    recordActivity: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser, isAdmin: (user?: { role?: string }) => user?.role === "ADMIN" }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));
vi.mock("@/server/lib/activity", () => ({ recordActivity }));

import { crisisRouter } from "../src/server/routers/crisis";

function caller() {
  return crisisRouter.createCaller({});
}

const event = {
  id: "event-1",
  orgId: "org-1",
  name: "Smith Wedding Weekend",
  startAt: new Date("2027-06-14T17:00:00.000Z"),
  endAt: new Date("2027-06-15T02:00:00.000Z"),
  guestTarget: 150,
  org: { ownerId: "planner-1", members: [{ userId: "planner-1" }] },
  bookingRequests: [{ id: "request-1", listingId: "listing-1" }],
  proposals: [
    {
      id: "proposal-1",
      title: "Floral proposal",
      listingId: "listing-1",
      totalCents: 250000,
      currency: "USD",
      contract: { id: "contract-1", title: "Floral contract", status: "FULLY_SIGNED" },
      milestones: [{ id: "milestone-1", title: "Deposit", status: "IN_ESCROW", amountCents: 125000 }],
    },
  ],
  contracts: [
    {
      id: "contract-1",
      title: "Floral contract",
      status: "FULLY_SIGNED",
      paymentIntents: [{ id: "intent-1", amountCents: 125000, status: "SUCCEEDED" }],
    },
  ],
};

describe("crisis issue workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", email: "planner@example.com", name: "Planner" });
    canManageEvent.mockReturnValue(true);
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.listing.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, title: where.id === "replacement-listing" ? "Backup Florals" : "Avery Florals", type: "VENDOR" }),
    );
    prisma.bookingRequest.create.mockResolvedValue({ id: "replacement-request-1" });
    prisma.crisisIssue.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "issue-1", ...data }));
    prisma.task.create.mockResolvedValue({ id: "task-1" });
    recordActivity.mockResolvedValue(undefined);
  });

  it("records issue impact and starts replacement recovery without automatic refund or payment effects", async () => {
    const result = await caller().create({
      eventId: "event-1",
      issueType: "VENDOR_CANCELLATION",
      severity: "CRITICAL",
      title: "Florist canceled week of event",
      proposalId: "proposal-1",
      contractId: "contract-1",
      paymentMilestoneId: "milestone-1",
      replacementListingId: "replacement-listing",
      description: "Provider reported they cannot staff the date.",
    });

    expect(prisma.bookingRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: "event-1",
        listingId: "replacement-listing",
        message: expect.stringContaining("Replacement recovery request"),
        notes: expect.stringContaining("manual review required"),
      }),
    }));
    expect(prisma.crisisIssue.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventId: "event-1",
        proposalId: "proposal-1",
        contractId: "contract-1",
        paymentMilestoneId: "milestone-1",
        status: "REPLACEMENT_STARTED",
        replacementBookingRequestId: "replacement-request-1",
        impactSummary: expect.stringContaining("No refund, release, cancellation, or legal conclusion is automatic"),
        recommendedNextAction: expect.stringContaining("Replacement recovery started"),
      }),
    }));
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "Crisis review: Florist canceled week of event", priority: "CRITICAL" }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "CRISIS_REPLACEMENT_STARTED",
      meta: expect.objectContaining({ noAutomaticMoneyMovement: true }),
    }));
    expect(result).toEqual(expect.objectContaining({ replacementBookingRequestId: "replacement-request-1" }));
  });

  it("rejects linked proposals that are not attached to the event", async () => {
    await expect(caller().create({
      eventId: "event-1",
      issueType: "PROVIDER_PROBLEM",
      severity: "HIGH",
      title: "Unlinked provider issue",
      proposalId: "other-proposal",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(prisma.crisisIssue.create).not.toHaveBeenCalled();
    expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
  });
});
