import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructEvent, getStripeOrThrow, headersMock, prisma } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getStripeOrThrow: vi.fn(),
  headersMock: vi.fn(),
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

import { POST } from "../src/app/api/stripe/webhook/route";

const paymentIntent = {
  id: "pi_test_123",
  object: "payment_intent",
  payment_method: "pm_test_123",
  metadata: { paymentIntentId: "internal-pi-1" },
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
      status: "REQUIRES_PAYMENT",
      contractId: "contract-1",
      milestoneId: "milestone-1",
      contract: {
        id: "contract-1",
        proposalId: "proposal-1",
        status: "FULLY_SIGNED",
      },
      milestone: { id: "milestone-1" },
    });
    prisma.$transaction.mockImplementation(async (fn) => fn({
      paymentIntent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      escrowAccount: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      paymentMilestone: { update: vi.fn().mockResolvedValue({}) },
      contract: { update: vi.fn().mockResolvedValue({}) },
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
