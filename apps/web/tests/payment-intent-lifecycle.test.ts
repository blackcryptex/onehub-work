import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, prisma, stripe, recordAcceptance, requireAcceptanceProof, recordActivity, evaluateHoldbackForPaymentIntent } = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma)),
    contract: { findUnique: vi.fn(), update: vi.fn() },
    escrowAccount: { create: vi.fn(), update: vi.fn() },
    paymentIntent: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    paymentMilestone: { update: vi.fn() },
    transaction: { create: vi.fn() },
  };

  return {
    auth: vi.fn(),
    prisma: mockPrisma,
    stripe: {
      paymentIntents: {
        retrieve: vi.fn(),
        create: vi.fn(),
        cancel: vi.fn(),
      },
    },
    recordAcceptance: vi.fn(),
    requireAcceptanceProof: vi.fn(),
    recordActivity: vi.fn(),
    evaluateHoldbackForPaymentIntent: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/stripe", () => ({ stripe, getStripeOrThrow: () => stripe }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: { PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED" },
  recordActivity,
}));
vi.mock("@/lib/logger", () => ({
  getRequestLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/errorTracker", () => ({ trackError: vi.fn() }));
vi.mock("@/lib/acceptance", async () => {
  const { z } = await import("zod");
  return {
    acceptanceInputSchema: z.object({ legalVersion: z.string() }).passthrough(),
    CURRENT_ACCEPTANCE_VERSIONS: { payment: "payment-v1" },
    recordAcceptance,
    requireAcceptanceProof,
  };
});
vi.mock("@/lib/holdback", () => ({ evaluateHoldbackForPaymentIntent }));
vi.mock("@/lib/legal-surface", () => ({ getLegalSurface: () => "payment.standard" }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "standard" }));
vi.mock("@/lib/fee-profile", () => ({
  resolveFeeProfile: () => ({
    platformFeeAmountCents: 300,
    netAmountCents: 9700,
    totalChargeAmountCents: 10300,
    payoutBasisAmountCents: 10000,
  }),
}));

import { POST as createIntentPOST } from "../src/app/api/payments/create-intent/route";
import { POST as confirmPOST } from "../src/app/api/payments/confirm/route";

const request = (body: unknown) => new Request("http://onehub.test/api/payments", {
  method: "POST",
  headers: { "content-type": "application/json", "x-request-id": "test-request" },
  body: JSON.stringify(body),
}) as never;

const contract = {
  id: "contract-1",
  status: "FULLY_SIGNED",
  buyerId: "buyer-org-1",
  sellerId: "seller-org-1",
  proposalId: "proposal-1",
  eventId: "event-1",
  proposal: {
    id: "proposal-1",
    currency: "USD",
    bookingClassification: "STANDARD",
    listingId: "listing-1",
    escrowAccount: { id: "escrow-1", balanceCents: 0, status: "EMPTY", stripeIntent: null },
    listing: { org: { ownerId: "seller-user-1" } },
    milestones: [{ id: "milestone-1", amountCents: 10000, status: "PENDING" }],
    event: { orgId: "buyer-org-1", org: { type: "CLIENT" } },
  },
  event: {
    id: "event-1",
    orgId: "buyer-org-1",
    org: { ownerId: "buyer-user-1", members: [] },
  },
};

const paymentIntent = {
  id: "pi-local-1",
  contractId: "contract-1",
  milestoneId: "milestone-1",
  payerId: "buyer-user-1",
  payeeId: "seller-user-1",
  amountCents: 10000,
  currency: "USD",
  status: "REQUIRES_PAYMENT",
  stripeIntentId: "pi_stripe_1",
  paymentMethod: null,
  contract: {
    id: "contract-1",
    status: "FULLY_SIGNED",
    eventId: "event-1",
    proposal: {
      id: "proposal-1",
      bookingClassification: "STANDARD",
      listingId: "listing-1",
      escrowAccount: { id: "escrow-1", balanceCents: 0, status: "EMPTY" },
      event: { orgId: "buyer-org-1", org: { type: "CLIENT" } },
    },
  },
  milestone: { id: "milestone-1", status: "PENDING" },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "buyer-user-1", role: "CLIENT" } });
  prisma.contract.findUnique.mockResolvedValue(contract);
  prisma.paymentIntent.findFirst.mockResolvedValue(null);
  prisma.paymentIntent.create.mockResolvedValue({ id: "pi-local-new" });
  prisma.paymentIntent.update.mockResolvedValue({});
  prisma.escrowAccount.create.mockResolvedValue(contract.proposal.escrowAccount);
  recordAcceptance.mockResolvedValue({ id: "acceptance-1" });
  requireAcceptanceProof.mockResolvedValue(undefined);
  recordActivity.mockResolvedValue(undefined);
  evaluateHoldbackForPaymentIntent.mockResolvedValue(undefined);
  stripe.paymentIntents.retrieve.mockResolvedValue({
    id: "pi_stripe_1",
    status: "succeeded",
    amount: 10000,
    currency: "usd",
    client_secret: "secret",
    metadata: { paymentIntentId: "pi-local-1", contractId: "contract-1", milestoneId: "milestone-1" },
    payment_method_types: ["card"],
    latest_charge: "ch_1",
    automatic_payment_methods: { allow_redirects: "never" },
  });
  stripe.paymentIntents.create.mockResolvedValue({
    id: "pi_stripe_new",
    status: "requires_payment_method",
    client_secret: "secret-new",
  });
  stripe.paymentIntents.cancel.mockResolvedValue({ id: "pi_stripe_old", status: "canceled" });
});

describe("payment intent lifecycle guardrails", () => {
  it("cancels stale active local intents with no Stripe intent before creating a replacement", async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue({
      id: "stale-local",
      stripeIntentId: null,
      amountCents: 10000,
      currency: "USD",
    });

    const response = await createIntentPOST(request({
      contractId: "contract-1",
      milestoneId: "milestone-1",
      acceptance: { legalVersion: "payment-v1" },
    }));

    expect(response.status).toBe(200);
    expect(prisma.paymentIntent.update).toHaveBeenCalledWith({
      where: { id: "stale-local" },
      data: { status: "CANCELLED" },
    });
    expect(prisma.paymentIntent.create).toHaveBeenCalled();
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });

  it("blocks confirming a cancelled local payment intent", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({ ...paymentIntent, status: "CANCELLED" });

    const response = await confirmPOST(request({ paymentIntentId: "pi-local-1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Payment intent is not confirmable" });
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks confirm when Stripe metadata does not match the local intent", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue(paymentIntent);
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_stripe_1",
      status: "succeeded",
      amount: 10000,
      currency: "usd",
      metadata: { paymentIntentId: "other-local", contractId: "contract-1", milestoneId: "milestone-1" },
      payment_method_types: ["card"],
      latest_charge: "ch_1",
    });

    const response = await confirmPOST(request({ paymentIntentId: "pi-local-1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Stripe payment intent does not match local payment record" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks confirm when Stripe amount or currency does not match local intent", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue(paymentIntent);
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_stripe_1",
      status: "succeeded",
      amount: 12000,
      currency: "usd",
      metadata: { paymentIntentId: "pi-local-1", contractId: "contract-1", milestoneId: "milestone-1" },
      payment_method_types: ["card"],
      latest_charge: "ch_1",
    });

    const response = await confirmPOST(request({ paymentIntentId: "pi-local-1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Stripe payment intent amount or currency mismatch" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("uses a fresh Stripe idempotency key when replacing a stale active intent", async () => {
    prisma.paymentIntent.findFirst.mockResolvedValue({
      id: "stale-local",
      stripeIntentId: "pi_stripe_old",
      amountCents: 10000,
      currency: "USD",
    });
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_stripe_old",
      status: "requires_payment_method",
      amount: 12000,
      currency: "usd",
      client_secret: "old-secret",
      metadata: { paymentIntentId: "stale-local", contractId: "contract-1", milestoneId: "milestone-1" },
      automatic_payment_methods: { allow_redirects: "never" },
    });

    const response = await createIntentPOST(request({
      contractId: "contract-1",
      milestoneId: "milestone-1",
      acceptance: { legalVersion: "payment-v1" },
    }));

    expect(response.status).toBe(200);
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_stripe_old");
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ paymentIntentId: "pi-local-new" }),
      }),
      { idempotencyKey: "payment-intent:pi-local-new:replacement:redirects-never:v1" }
    );
    expect(stripe.paymentIntents.create).not.toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: "contract:contract-1:milestone:milestone-1:amount:10000:redirects-never:v1" }
    );
  });

  it("keeps successful confirm idempotent without double-crediting escrow", async () => {
    prisma.paymentIntent.findUnique.mockResolvedValue({ ...paymentIntent, status: "SUCCEEDED" });

    const response = await confirmPOST(request({ paymentIntentId: "pi-local-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, message: "Payment already confirmed." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.update).not.toHaveBeenCalled();
  });
});
