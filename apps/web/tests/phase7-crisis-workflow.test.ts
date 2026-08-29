import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, prisma, canManageEvent, recordActivity } = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    event: { findUnique: vi.fn() },
    listing: { findUnique: vi.fn() },
    bookingRequest: { create: vi.fn() },
    crisisIssue: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    task: { create: vi.fn() },
    budgetLine: { create: vi.fn() },
    notification: { createMany: vi.fn() },
    paymentHoldback: { upsert: vi.fn() },
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
  org: {
    ownerId: "planner-owner-1",
    members: [
      { userId: "planner-1", role: "ADMIN" },
      { userId: "planner-owner-1", role: "OWNER" },
    ],
  },
  bookingRequests: [{ id: "request-1", listingId: "listing-1" }],
  proposals: [
    {
      id: "proposal-1",
      bookingClassification: "MARKETPLACE",
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
      proposalId: "proposal-1",
      title: "Floral contract",
      status: "FULLY_SIGNED",
      paymentIntents: [{ id: "intent-1", amountCents: 125000, status: "SUCCEEDED", milestoneId: "milestone-1" }],
    },
  ],
};

describe("crisis issue workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER", email: "planner@example.com", name: "Planner" });
    canManageEvent.mockReturnValue(true);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.event.findUnique.mockResolvedValue(event);
    prisma.listing.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        title: where.id === "replacement-listing" ? "Backup Florals" : "Avery Florals",
        type: "VENDOR",
        orgId: where.id === "replacement-listing" ? "replacement-org-1" : "provider-org-1",
        org: {
          members: where.id === "replacement-listing"
            ? [{ userId: "replacement-admin-1", role: "ADMIN" }]
            : [{ userId: "provider-admin-1", role: "ADMIN" }],
        },
      }),
    );
    prisma.bookingRequest.create.mockResolvedValue({ id: "replacement-request-1" });
    prisma.crisisIssue.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "issue-1", ...data }));
    prisma.crisisIssue.findUnique.mockResolvedValue({
      id: "issue-1",
      orgId: "org-1",
      eventId: "event-1",
      status: "REPLACEMENT_STARTED",
      manualReviewNotes: "Manual review required.",
      auditTrail: { source: "phase7_crisis_workflow" },
      event,
    });
    prisma.crisisIssue.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "issue-1", ...data }));
    prisma.task.create.mockResolvedValue({ id: "task-1" });
    prisma.budgetLine.create.mockResolvedValue({ id: "budget-risk-1" });
    prisma.notification.createMany.mockResolvedValue({ count: 4 });
    prisma.paymentHoldback.upsert.mockResolvedValue({ id: "holdback-1", state: "ACTIVE" });
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
        auditTrail: expect.objectContaining({
          linkedContext: expect.objectContaining({ stakeholderNotificationIds: expect.arrayContaining(["planner-1", "provider-admin-1", "replacement-admin-1"]) }),
          workflowState: expect.objectContaining({ paymentRiskIntentIds: ["intent-1"] }),
        }),
      }),
    }));
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: "Crisis review: Florist canceled week of event",
        priority: "CRITICAL",
        description: expect.stringContaining("Crisis issue issue-1"),
        dueAt: expect.any(Date),
      }),
    }));
    expect(prisma.budgetLine.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        label: "Crisis recovery reserve: Florist canceled week of event",
        plannedCents: 0,
        actualCents: 0,
        notes: expect.stringContaining("Non-money-moving W7 budget/payment risk marker"),
      }),
    }));
    expect(prisma.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: "planner-1", type: "CRISIS_ISSUE", title: "Crisis reported: Florist canceled week of event" }),
        expect.objectContaining({ userId: "provider-admin-1", type: "CRISIS_ISSUE" }),
        expect.objectContaining({ userId: "replacement-admin-1", type: "CRISIS_ISSUE" }),
      ]),
      skipDuplicates: true,
    }));
    expect(prisma.paymentHoldback.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { paymentIntentId: "intent-1" },
      create: expect.objectContaining({
        milestoneId: "milestone-1",
        state: "ACTIVE",
        reason: expect.stringContaining("crisis payment risk review blocks release"),
        manualRiskFlag: true,
      }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "CRISIS_REPLACEMENT_STARTED",
      meta: expect.objectContaining({
        noAutomaticMoneyMovement: true,
        notificationsCreated: 4,
        paymentRiskHoldbacksApplied: 1,
      }),
    }));
    expect(result).toEqual(expect.objectContaining({ replacementBookingRequestId: "replacement-request-1" }));
  });

  it("rejects linked proposals that are not attached to the event before creating workflow records", async () => {
    await expect(caller().create({
      eventId: "event-1",
      issueType: "PROVIDER_PROBLEM",
      severity: "HIGH",
      title: "Unlinked provider issue",
      proposalId: "other-proposal",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(prisma.crisisIssue.create).not.toHaveBeenCalled();
    expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(prisma.paymentHoldback.upsert).not.toHaveBeenCalled();
  });

  it("blocks unrelated users from creating crisis issues for an event", async () => {
    canManageEvent.mockReturnValue(false);

    await expect(caller().create({
      eventId: "event-1",
      issueType: "PROVIDER_PROBLEM",
      severity: "HIGH",
      title: "Wrong role issue report",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.crisisIssue.create).not.toHaveBeenCalled();
  });

  it("records a guarded resolution without moving money or deleting linked context", async () => {
    const closed = await caller().close({
      issueId: "issue-1",
      status: "RESOLVED",
      resolutionNote: "Replacement florist accepted and admin reviewed payment risk.",
    });

    expect(prisma.crisisIssue.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "issue-1" },
      data: expect.objectContaining({
        status: "RESOLVED",
        manualReviewNotes: expect.stringContaining("Replacement florist accepted"),
        recommendedNextAction: expect.stringContaining("Crisis resolution recorded"),
        auditTrail: expect.objectContaining({
          closedById: "planner-1",
          closingStatus: "RESOLVED",
          noAutomaticMoneyMovement: true,
        }),
      }),
    }));
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "CRISIS_ISSUE_RESOLVED",
      meta: expect.objectContaining({ noAutomaticMoneyMovement: true }),
    }));
    expect(closed).toEqual(expect.objectContaining({ status: "RESOLVED" }));
  });
});
