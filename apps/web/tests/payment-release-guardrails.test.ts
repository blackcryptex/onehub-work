import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentUser,
  canReleaseMilestonePayment,
  prisma,
  stripe,
  recordActivity,
  recordAudit,
  recordAcceptance,
  recordAdminOverride,
  hasBlockingRefundRequest,
  getBlockingDisputeCase,
  getBlockingHoldbackForMilestone,
} = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    paymentMilestone: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    payout: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    escrowAccount: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    contract: { update: vi.fn() },
    organization: { findUnique: vi.fn() },
    transaction: { findFirst: vi.fn() },
    moneyTx: { create: vi.fn() },
  };

  return {
    getCurrentUser: vi.fn(),
    canReleaseMilestonePayment: vi.fn(),
    prisma: mockPrisma,
    stripe: { transfers: { create: vi.fn() } },
    recordActivity: vi.fn(),
    recordAudit: vi.fn(),
    recordAcceptance: vi.fn(),
    recordAdminOverride: vi.fn(),
    hasBlockingRefundRequest: vi.fn(),
    getBlockingDisputeCase: vi.fn(),
    getBlockingHoldbackForMilestone: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ canReleaseMilestonePayment }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/stripe", () => ({ stripe }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: { MILESTONE_FUNDS_RELEASED: "MILESTONE_FUNDS_RELEASED" },
  recordActivity,
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit }));
vi.mock("@/lib/logger", () => ({
  getRequestLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "standard" }));
vi.mock("@/lib/fee-profile", () => ({
  resolveFeeProfile: () => ({
    platformFeeAmountCents: 300,
    netAmountCents: 9700,
    totalChargeAmountCents: 10300,
    payoutBasisAmountCents: 10000,
  }),
}));
vi.mock("@/lib/acceptance", async () => {
  const { z } = await import("zod");
  return {
    acceptanceInputSchema: z.object({ legalVersion: z.string() }).passthrough(),
    CURRENT_ACCEPTANCE_VERSIONS: { adminOverride: "admin-v1" },
    recordAcceptance,
  };
});
vi.mock("@/lib/refund-request", () => ({ hasBlockingRefundRequest }));
vi.mock("@/lib/dispute-case", () => ({ getBlockingDisputeCase }));
vi.mock("@/lib/holdback", () => ({ getBlockingHoldbackForMilestone }));
vi.mock("@/lib/legal-surface", () => ({ getLegalSurface: () => "adminOverride.standard" }));
vi.mock("@/lib/admin-override", () => ({ recordAdminOverride }));

import { POST } from "../src/app/api/payments/release-milestone/route";

const request = () => new Request("http://onehub.test/api/payments/release-milestone", {
  method: "POST",
  headers: { "content-type": "application/json", "x-request-id": "test-request" },
  body: JSON.stringify({
    milestoneId: "milestone-1",
    reason: "approved after manual review",
    acceptance: { legalVersion: "admin-v1" },
  }),
}) as never;

const milestone = {
  id: "milestone-1",
  proposalId: "proposal-1",
  title: "Deposit",
  amountCents: 10000,
  status: "IN_ESCROW",
  proposal: {
    id: "proposal-1",
    currency: "USD",
    bookingClassification: "STANDARD",
    listingId: "listing-1",
    escrowAccount: { id: "escrow-1", balanceCents: 10000, status: "OPEN" },
    contract: { id: "contract-1", status: "IN_PAYMENT", sellerId: "seller-org-1" },
    event: { id: "event-1", orgId: "buyer-org-1", org: { type: "CLIENT", members: [], owner: { id: "buyer-user-1" } } },
    listing: { org: { id: "seller-org-1", owner: { id: "seller-user-1" }, stripeConnectAccountId: "acct_1" } },
    org: { owner: { id: "seller-user-1" } },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "admin-1", role: "PLATFORM_ADMIN" });
  canReleaseMilestonePayment.mockReturnValue(true);
  prisma.paymentMilestone.findUnique.mockResolvedValue(milestone);
  prisma.payout.findFirst.mockResolvedValue(null);
  prisma.payout.create.mockResolvedValue({ id: "payout-1", status: "PENDING", stripeTransfer: null });
  prisma.payout.update.mockResolvedValue({ id: "payout-1", status: "SENT", stripeTransfer: "tr_1" });
  prisma.escrowAccount.findUnique.mockResolvedValue({ id: "escrow-1", balanceCents: 10000, status: "OPEN" });
  prisma.escrowAccount.updateMany.mockResolvedValue({ count: 1 });
  prisma.escrowAccount.update.mockResolvedValue({});
  prisma.paymentMilestone.update.mockResolvedValue({});
  prisma.paymentMilestone.findMany.mockResolvedValue([{ id: "milestone-1", status: "PAID" }]);
  prisma.transaction.findFirst.mockResolvedValue({ stripeChargeId: "ch_1" });
  prisma.moneyTx.create.mockResolvedValue({});
  stripe.transfers.create.mockResolvedValue({ id: "tr_1" });
  recordAcceptance.mockResolvedValue({ id: "acceptance-1" });
  recordActivity.mockResolvedValue(undefined);
  recordAudit.mockResolvedValue(undefined);
  recordAdminOverride.mockResolvedValue(undefined);
  hasBlockingRefundRequest.mockResolvedValue(null);
  getBlockingDisputeCase.mockResolvedValue(null);
  getBlockingHoldbackForMilestone.mockResolvedValue(null);
});

describe("release milestone payment guardrails", () => {
  it("blocks release while an open refund request exists before escrow debit, payout, or Stripe transfer", async () => {
    hasBlockingRefundRequest.mockResolvedValue({ id: "refund-open-1", status: "OPEN" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "Release blocked while an open refund request is under admin review",
      refundRequestId: "refund-open-1",
    });
    expect(hasBlockingRefundRequest).toHaveBeenCalledWith("proposal-1", "milestone-1");
    expect(getBlockingDisputeCase).not.toHaveBeenCalled();
    expect(getBlockingHoldbackForMilestone).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it("blocks release while an open dispute case exists before escrow debit, payout, or Stripe transfer", async () => {
    getBlockingDisputeCase.mockResolvedValue({
      id: "dispute-open-1",
      status: "UNDER_ADMIN_REVIEW",
      freezeState: "ADMIN_REVIEW",
    });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "Release blocked while an open dispute case is frozen for admin review",
      disputeId: "dispute-open-1",
      disputeStatus: "UNDER_ADMIN_REVIEW",
      freezeState: "ADMIN_REVIEW",
    });
    expect(hasBlockingRefundRequest).toHaveBeenCalledWith("proposal-1", "milestone-1");
    expect(getBlockingDisputeCase).toHaveBeenCalledWith("proposal-1", "milestone-1");
    expect(getBlockingHoldbackForMilestone).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it("blocks release while an active holdback exists before escrow debit, payout, or Stripe transfer", async () => {
    getBlockingHoldbackForMilestone.mockResolvedValue({
      id: "holdback-active-1",
      state: "ACTIVE",
      reason: "manual risk review",
    });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "Release blocked while a payment holdback is active",
      holdbackId: "holdback-active-1",
      holdbackState: "ACTIVE",
      holdbackReason: "manual risk review",
    });
    expect(hasBlockingRefundRequest).toHaveBeenCalledWith("proposal-1", "milestone-1");
    expect(getBlockingDisputeCase).toHaveBeenCalledWith("proposal-1", "milestone-1");
    expect(getBlockingHoldbackForMilestone).toHaveBeenCalledWith("milestone-1");
    expect(recordAcceptance).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it("blocks release when the atomic escrow debit reservation cannot decrement the balance", async () => {
    prisma.escrowAccount.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Insufficient escrow balance" });
    expect(prisma.escrowAccount.updateMany).toHaveBeenCalledWith({
      where: {
        id: "escrow-1",
        balanceCents: { gte: 10000 },
      },
      data: {
        balanceCents: { decrement: 10000 },
        status: "RELEASED",
      },
    });
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it("blocks duplicate payout creation when a payout already exists for the milestone", async () => {
    prisma.payout.findFirst.mockResolvedValue({ id: "payout-existing", status: "SENT" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Payout already exists for milestone" });
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });

  it("does not mark milestone paid when Stripe transfer fails for a connected recipient", async () => {
    stripe.transfers.create.mockRejectedValue(new Error("transfer failed"));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({ error: "Stripe transfer failed; payment was not released" });
    expect(prisma.escrowAccount.updateMany).toHaveBeenCalled();
    expect(prisma.payout.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PENDING" }),
    }));
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(prisma.payout.update).not.toHaveBeenCalled();
  });

  it("rechecks milestone status inside the transaction before release", async () => {
    prisma.paymentMilestone.findUnique
      .mockResolvedValueOnce(milestone)
      .mockResolvedValueOnce({ ...milestone, status: "OVERDUE" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Milestone is not in escrow" });
    expect(prisma.payout.create).not.toHaveBeenCalled();
  });

  it("uses a deterministic Stripe idempotency key tied to payout and milestone", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(stripe.transfers.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 10000,
      metadata: expect.objectContaining({ payoutId: "payout-1", milestoneId: "milestone-1" }),
    }), {
      idempotencyKey: "release-milestone:milestone-1:payout:payout-1:v1",
    });
  });

  it("uses canonical in-transaction amount and payout ids in release transfer, money transaction, activity, and audit metadata", async () => {
    const currentMilestone = { ...milestone, amountCents: 8000 };
    prisma.paymentMilestone.findUnique
      .mockResolvedValueOnce(milestone)
      .mockResolvedValueOnce(currentMilestone);
    prisma.escrowAccount.findUnique.mockResolvedValue({ id: "escrow-1", balanceCents: 8000, status: "OPEN" });
    prisma.payout.create.mockResolvedValue({ id: "payout-1", status: "PENDING", amountCents: 8000, stripeTransfer: null });
    prisma.payout.update.mockResolvedValue({ id: "payout-1", status: "SENT", amountCents: 8000, stripeTransfer: "tr_1" });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(stripe.transfers.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 8000,
      metadata: expect.objectContaining({ payoutId: "payout-1", milestoneId: "milestone-1" }),
    }), expect.any(Object));
    expect(prisma.moneyTx.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "RELEASE_ESCROW",
        amountCents: 8000,
        stripeId: "tr_1",
        meta: expect.objectContaining({
          payoutId: "payout-1",
          escrowBalanceBefore: 8000,
          escrowBalanceAfter: 0,
          feeProfile: expect.objectContaining({ payoutBasisAmountCents: 10000 }),
        }),
      }),
    });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({
        amountCents: 8000,
        payoutId: "payout-1",
        stripeTransferId: "tr_1",
        escrowStatusAfter: "RELEASED",
      }),
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        amountCents: 8000,
        payoutId: "payout-1",
        stripeTransferId: "tr_1",
      }),
    }));
    expect(recordAdminOverride).toHaveBeenCalledWith(expect.objectContaining({
      targetId: "payout-1",
      payoutId: "payout-1",
      metadata: expect.objectContaining({ stripeTransferId: "tr_1" }),
    }));
  });

  it("finalizes an existing pending payout retry with canonical escrow metadata", async () => {
    prisma.payout.findFirst.mockResolvedValue({
      id: "payout-pending",
      status: "PENDING",
      amountCents: 10000,
      stripeTransfer: null,
    });
    prisma.escrowAccount.findUnique.mockResolvedValue({ id: "escrow-1", balanceCents: 0, status: "RELEASED" });
    prisma.payout.update.mockResolvedValue({
      id: "payout-pending",
      status: "SENT",
      amountCents: 10000,
      stripeTransfer: "tr_retry",
    });
    stripe.transfers.create.mockResolvedValue({ id: "tr_retry" });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(stripe.transfers.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 10000,
      metadata: expect.objectContaining({ payoutId: "payout-pending", milestoneId: "milestone-1" }),
    }), {
      idempotencyKey: "release-milestone:milestone-1:payout:payout-pending:v1",
    });
    expect(prisma.moneyTx.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "RELEASE_ESCROW",
        amountCents: 10000,
        stripeId: "tr_retry",
        meta: expect.objectContaining({
          payoutId: "payout-pending",
          escrowBalanceBefore: 10000,
          escrowBalanceAfter: 0,
        }),
      }),
    });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({
        payoutId: "payout-pending",
        stripeTransferId: "tr_retry",
        escrowStatusAfter: "RELEASED",
      }),
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        payoutId: "payout-pending",
        stripeTransferId: "tr_retry",
      }),
    }));
  });

  it("preserves idempotent already-paid behavior when an existing payout is present", async () => {
    prisma.paymentMilestone.findUnique.mockResolvedValue({ ...milestone, status: "PAID" });
    prisma.payout.findFirst.mockResolvedValue({ id: "payout-existing", status: "SENT" });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      payoutId: "payout-existing",
      message: "Payment already released",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(stripe.transfers.create).not.toHaveBeenCalled();
  });
});
