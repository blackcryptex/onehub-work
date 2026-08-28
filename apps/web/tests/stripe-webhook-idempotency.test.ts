import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructEvent, getStripeOrThrow, headersMock, prisma, requireAcceptanceProof, recordActivity, evaluateHoldbackForPaymentIntent } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getStripeOrThrow: vi.fn(),
  headersMock: vi.fn(),
  requireAcceptanceProof: vi.fn(),
  recordActivity: vi.fn(),
  evaluateHoldbackForPaymentIntent: vi.fn(),
  prisma: {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    paymentIntent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/server/lib/stripe", () => ({ getStripeOrThrow }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/acceptance", () => ({ requireAcceptanceProof }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: { PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED" },
  recordActivity,
}));
vi.mock("@/lib/holdback", () => ({ evaluateHoldbackForPaymentIntent }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "standard" }));
vi.mock("@/lib/fee-profile", () => ({
  resolveFeeProfile: () => ({
    platformFeeAmountCents: 300,
    netAmountCents: 9700,
    totalChargeAmountCents: 5000,
    payoutBasisAmountCents: 4700,
  }),
}));

import { POST } from "../src/app/api/stripe/webhook/route";

const paymentIntent = {
  id: "pi_test_123",
  object: "payment_intent",
  status: "succeeded",
  payment_method: "pm_test_123",
  amount: 5000,
  currency: "usd",
  latest_charge: "ch_test_123",
  metadata: { paymentIntentId: "internal-pi-1", contractId: "contract-1", milestoneId: "milestone-1" },
};

const stripeEvent = {
  id: "evt_test_123",
  type: "payment_intent.succeeded",
  data: { object: paymentIntent },
};

function signedRequest() {
  return new Request("http://test.local/api/stripe/webhook", {
    method: "POST",
    body: JSON.stringify(stripeEvent),
  }) as never;
}

describe("stripe webhook idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    headersMock.mockReturnValue(new Headers({ "stripe-signature": "sig_test" }));
    constructEvent.mockReturnValue(stripeEvent);
    getStripeOrThrow.mockReturnValue({ webhooks: { constructEvent } });
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({ id: "webhook-1" });
    prisma.webhookEvent.update.mockResolvedValue({ id: "webhook-1" });
    prisma.webhookEvent.delete.mockResolvedValue({ id: "webhook-1" });
    prisma.paymentIntent.findUnique.mockResolvedValue({
      id: "internal-pi-1",
      amountCents: 5000,
      currency: "USD",
      status: "REQUIRES_PAYMENT",
      contractId: "contract-1",
      milestoneId: "milestone-1",
      payerId: "payer-1",
      payeeId: "payee-1",
      contract: {
        id: "contract-1",
        proposalId: "proposal-1",
        status: "FULLY_SIGNED",
        eventId: "event-1",
        proposal: {
          id: "proposal-1",
          bookingClassification: "STANDARD",
          listingId: "listing-1",
          escrowAccount: { id: "escrow-1", balanceCents: 0, status: "OPEN" },
          event: { orgId: "org-1", org: { type: "CLIENT" } },
        },
      },
      milestone: { id: "milestone-1", status: "PENDING" },
    });
    requireAcceptanceProof.mockResolvedValue({ id: "acceptance-1" });
    recordActivity.mockResolvedValue(undefined);
    evaluateHoldbackForPaymentIntent.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (fn) => fn({
      paymentIntent: { findUnique: prisma.paymentIntent.findUnique, update: vi.fn().mockResolvedValue({}) },
      escrowAccount: { update: vi.fn().mockResolvedValue({}) },
      paymentMilestone: { update: vi.fn().mockResolvedValue({}) },
      contract: { update: vi.fn().mockResolvedValue({}) },
      transaction: { create: vi.fn().mockResolvedValue({}) },
    }));
  });

  it("reserves the webhook before business handling and releases it on failure", async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error("business failure"));

    const response = await POST(signedRequest());

    expect(response.status).toBe(500);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "evt_test_123",
        type: "payment_intent.succeeded",
        stripeIntentId: "pi_test_123",
        processedAt: null,
        meta: stripeEvent,
      }),
      select: { id: true },
    });
    expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.delete).toHaveBeenCalledWith({ where: { id: "webhook-1" } });
  });

  it("marks a reserved webhook processed after successful business handling", async () => {
    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "evt_test_123",
        type: "payment_intent.succeeded",
        stripeIntentId: "pi_test_123",
        processedAt: null,
        meta: stripeEvent,
      }),
      select: { id: true },
    });
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: "webhook-1" },
      data: { processedAt: expect.any(Date) },
    });
    expect(prisma.webhookEvent.delete).not.toHaveBeenCalled();
  });

  it("skips already processed webhook events as duplicates", async () => {
    prisma.webhookEvent.create.mockRejectedValueOnce(new Error("unique eventId"));
    prisma.webhookEvent.findUnique.mockResolvedValueOnce({ processedAt: new Date("2026-01-01T00:00:00Z") });

    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.delete).not.toHaveBeenCalled();
  });

  it("returns retryable conflict for an in-progress webhook reservation", async () => {
    prisma.webhookEvent.create.mockRejectedValueOnce(new Error("unique eventId"));
    prisma.webhookEvent.findUnique.mockResolvedValueOnce({ processedAt: null });

    const response = await POST(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Webhook handling is already in progress" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.delete).not.toHaveBeenCalled();
  });
});
