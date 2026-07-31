import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, stripe, recordAudit, recordAdminOverride, getGuardedMvpAuthorityForUserId } = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    refundRequest: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    paymentIntent: { findUnique: vi.fn() },
    escrowAccount: { updateMany: vi.fn() },
    paymentMilestone: { update: vi.fn() },
    moneyTx: { create: vi.fn(), update: vi.fn() },
  };

  return {
    prisma: mockPrisma,
    stripe: { refunds: { create: vi.fn() } },
    recordAudit: vi.fn(),
    recordAdminOverride: vi.fn(),
    getGuardedMvpAuthorityForUserId: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/stripe", () => ({ stripe }));
vi.mock("@/server/lib/audit", () => ({ recordAudit }));
vi.mock("@/lib/admin-override", () => ({
  feeOverrideRequiresAdminOverride: vi.fn(() => false),
  recordAdminOverride,
}));
vi.mock("@/lib/rbac", () => ({ getGuardedMvpAuthorityForUserId }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: vi.fn() }));
vi.mock("@/lib/fee-profile", () => ({ resolveFeeProfile: vi.fn() }));

import { reviewRefundRequest } from "../src/lib/refund-request";

const refundRequest = {
  id: "refund-1",
  orgId: "org-1",
  proposalId: "proposal-1",
  contractId: "contract-1",
  paymentIntentId: "pi-local-1",
  milestoneId: "milestone-1",
  status: "OPEN",
  amountRequestedCents: 10000,
  currency: "USD",
  processingFeeTreatment: "BUYER_ABSORBS",
  platformFeeTreatment: "NON_REFUNDABLE",
  bookingClassification: "DIRECT",
  feeProfileSnapshot: { platformFeeAmountCents: 500, netAmountCents: 9500 },
  acceptanceCaptureId: "acceptance-1",
  auditTrail: { createdBy: "buyer-1" },
};

const paymentIntent = {
  id: "pi-local-1",
  amountCents: 10000,
  currency: "USD",
  stripeIntentId: "pi_stripe_1",
  transactions: { stripeChargeId: "ch_1" },
  contract: { proposal: { escrowAccount: { id: "escrow-1", balanceCents: 10000 } } },
  milestone: { id: "milestone-1", amountCents: 10000, status: "IN_ESCROW" },
};

beforeEach(() => {
  vi.clearAllMocks();
  getGuardedMvpAuthorityForUserId.mockResolvedValue({ id: "admin-1", role: "PLATFORM_ADMIN" });
  prisma.refundRequest.findUnique.mockResolvedValue(refundRequest);
  prisma.paymentIntent.findUnique.mockResolvedValue(paymentIntent);
  prisma.refundRequest.updateMany.mockResolvedValue({ count: 1 });
  prisma.refundRequest.update.mockResolvedValue({ ...refundRequest, status: "APPROVED" });
  prisma.escrowAccount.updateMany.mockResolvedValue({ count: 1 });
  prisma.paymentMilestone.update.mockResolvedValue({});
  prisma.moneyTx.create.mockResolvedValue({ id: "money-refund-1" });
  prisma.moneyTx.update.mockResolvedValue({ id: "money-refund-1", stripeId: "re_1" });
  stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded" });
  recordAudit.mockResolvedValue(undefined);
  recordAdminOverride.mockResolvedValue(undefined);
});

describe("refund request review effects", () => {
  it("executes Stripe and local refund effects before approving an on-ledger refund", async () => {
    const result = await reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    });

    expect(result.status).toBe("APPROVED");
    expect(prisma.refundRequest.updateMany).toHaveBeenCalledWith({
      where: { id: "refund-1", status: "OPEN" },
      data: {
        auditTrail: expect.objectContaining({
          refundReservation: expect.objectContaining({
            state: "STRIPE_REFUND_PENDING",
            stripeRefundIdempotencyKey: "refund-request:refund-1:payment-intent:pi-local-1:v1",
          }),
        }),
      },
    });
    expect(prisma.escrowAccount.updateMany).toHaveBeenCalledWith({
      where: {
        id: "escrow-1",
        balanceCents: 10000,
      },
      data: {
        balanceCents: { decrement: 10000 },
        status: "REFUNDED",
      },
    });
    expect(prisma.moneyTx.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "REFUND_ESCROW",
        proposalId: "proposal-1",
        milestoneId: "milestone-1",
        amountCents: 10000,
        meta: expect.objectContaining({ state: "STRIPE_REFUND_PENDING" }),
      }),
    });
    expect(stripe.refunds.create).toHaveBeenCalledWith({
      charge: "ch_1",
      amount: 10000,
      metadata: expect.objectContaining({
        refundRequestId: "refund-1",
        paymentIntentId: "pi-local-1",
        milestoneId: "milestone-1",
        moneyTxId: "money-refund-1",
      }),
    }, {
      idempotencyKey: "refund-request:refund-1:payment-intent:pi-local-1:v1",
    });
    expect(prisma.paymentMilestone.update).toHaveBeenCalledWith({
      where: { id: "milestone-1" },
      data: { status: "REFUNDED" },
    });
    expect(prisma.moneyTx.update).toHaveBeenCalledWith({
      where: { id: "money-refund-1" },
      data: expect.objectContaining({
        stripeId: "re_1",
        meta: expect.objectContaining({
          state: "STRIPE_REFUND_CREATED",
          stripeRefundId: "re_1",
        }),
      }),
    });
    expect(prisma.refundRequest.update).toHaveBeenCalledWith({
      where: { id: "refund-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        auditTrail: expect.objectContaining({
          refundEffects: expect.objectContaining({
            stripeRefundId: "re_1",
            moneyTxId: "money-refund-1",
          }),
        }),
      }),
    });
    expect(prisma.moneyTx.create.mock.invocationCallOrder[0]).toBeLessThan(stripe.refunds.create.mock.invocationCallOrder[0]);
  });

  it("does not execute Stripe refund effects for denied refund requests", async () => {
    await reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "DENIED",
      decisionReason: "not eligible",
    });

    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(prisma.moneyTx.create).not.toHaveBeenCalled();
    expect(prisma.refundRequest.update).toHaveBeenCalledWith({
      where: { id: "refund-1" },
      data: expect.objectContaining({ status: "DENIED" }),
    });
  });

  it("does not create a Stripe refund when local escrow cannot cover the approved refund", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({
      ...paymentIntent,
      contract: { proposal: { escrowAccount: { id: "escrow-1", balanceCents: 5000 } } },
    });

    await expect(reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    })).rejects.toThrow("Insufficient escrow balance for refund");

    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.updateMany).not.toHaveBeenCalled();
    expect(prisma.refundRequest.update).not.toHaveBeenCalled();
  });

  it("does not create a Stripe refund when the escrow balance changed before local reservation", async () => {
    prisma.escrowAccount.updateMany.mockResolvedValue({ count: 0 });

    await expect(reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    })).rejects.toThrow("Escrow balance changed before refund reservation; retry required");

    expect(prisma.refundRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "refund-1", status: "OPEN" },
    }));
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.moneyTx.create).not.toHaveBeenCalled();
    expect(prisma.refundRequest.update).not.toHaveBeenCalled();
  });

  it("leaves a pending local refund reservation if Stripe creation fails after escrow debit", async () => {
    stripe.refunds.create.mockRejectedValue(new Error("stripe unavailable"));

    await expect(reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    })).rejects.toThrow("stripe unavailable");

    expect(prisma.escrowAccount.updateMany).toHaveBeenCalled();
    expect(prisma.moneyTx.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meta: expect.objectContaining({
          state: "STRIPE_REFUND_PENDING",
          stripeRefundIdempotencyKey: "refund-request:refund-1:payment-intent:pi-local-1:v1",
        }),
      }),
    });
    expect(prisma.moneyTx.update).not.toHaveBeenCalled();
    expect(prisma.refundRequest.update).toHaveBeenCalledWith({
      where: { id: "refund-1" },
      data: {
        auditTrail: expect.objectContaining({
          refundReservation: expect.objectContaining({
            state: "STRIPE_REFUND_PENDING",
            moneyTxId: "money-refund-1",
          }),
        }),
      },
    });
    expect(prisma.refundRequest.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "APPROVED" }),
    }));
  });

  it("recovers an approved refund when Stripe succeeds but local finalization fails", async () => {
    prisma.moneyTx.update
      .mockRejectedValueOnce(new Error("db finalization unavailable"))
      .mockResolvedValue({ id: "money-refund-1", stripeId: "re_1" });

    await expect(reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    })).rejects.toThrow("db finalization unavailable");

    const recoveryReservation = {
      refundRequestId: "refund-1",
      paymentIntentId: "pi-local-1",
      stripeChargeId: "ch_1",
      stripeRefundIdempotencyKey: "refund-request:refund-1:payment-intent:pi-local-1:v1",
      escrowAccountId: "escrow-1",
      escrowBalanceBefore: 10000,
      escrowBalanceAfter: 0,
      amountCents: 10000,
      reservedAt: expect.any(String),
      state: "STRIPE_REFUND_PENDING",
      moneyTxId: "money-refund-1",
    };

    prisma.refundRequest.findUnique.mockResolvedValueOnce({
      ...refundRequest,
      auditTrail: {
        ...refundRequest.auditTrail,
        refundReservation: recoveryReservation,
      },
    });
    prisma.paymentIntent.findUnique.mockResolvedValueOnce({
      ...paymentIntent,
      contract: { proposal: { escrowAccount: { id: "escrow-1", balanceCents: 0 } } },
    });

    const result = await reviewRefundRequest({
      refundRequestId: "refund-1",
      adminId: "admin-1",
      decision: "APPROVED",
      decisionReason: "approved buyer refund",
    });

    expect(result.status).toBe("APPROVED");
    expect(prisma.escrowAccount.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.paymentMilestone.update).toHaveBeenCalledTimes(1);
    expect(prisma.moneyTx.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledTimes(2);
    expect(stripe.refunds.create).toHaveBeenLastCalledWith({
      charge: "ch_1",
      amount: 10000,
      metadata: expect.objectContaining({
        refundRequestId: "refund-1",
        paymentIntentId: "pi-local-1",
        milestoneId: "milestone-1",
        moneyTxId: "money-refund-1",
      }),
    }, {
      idempotencyKey: "refund-request:refund-1:payment-intent:pi-local-1:v1",
    });
    expect(prisma.refundRequest.update).toHaveBeenLastCalledWith({
      where: { id: "refund-1" },
      data: expect.objectContaining({
        status: "APPROVED",
        auditTrail: expect.objectContaining({
          refundReservation: expect.objectContaining({
            state: "STRIPE_REFUND_CREATED",
            stripeRefundId: "re_1",
            moneyTxId: "money-refund-1",
          }),
          refundEffects: expect.objectContaining({
            stripeRefundId: "re_1",
            moneyTxId: "money-refund-1",
          }),
        }),
      }),
    });
  });
});
