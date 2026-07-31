import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    organization: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    proposal: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    event: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    paymentIntent: { findMany: vi.fn(), deleteMany: vi.fn() },
    adminOverride: { deleteMany: vi.fn() },
    acceptanceCapture: { deleteMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    activity: { deleteMany: vi.fn() },
    moneyTx: { deleteMany: vi.fn() },
    transaction: { deleteMany: vi.fn() },
    refundRequest: { deleteMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    dispute: { deleteMany: vi.fn(), updateMany: vi.fn() },
    paymentHoldback: { deleteMany: vi.fn(), updateMany: vi.fn() },
    payout: { deleteMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    escrowAccount: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    paymentMilestone: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    signature: { deleteMany: vi.fn(), createMany: vi.fn() },
    contract: { deleteMany: vi.fn(), create: vi.fn() },
    proposalLineItem: { deleteMany: vi.fn(), create: vi.fn() },
    proposalSection: { deleteMany: vi.fn() },
    shortlistItem: { deleteMany: vi.fn() },
    listing: { deleteMany: vi.fn(), create: vi.fn() },
    membership: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "../src/app/api/e2e/payment/route";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ONEHUB_E2E_TEST_MODE: process.env.ONEHUB_E2E_TEST_MODE,
  DATABASE_URL: process.env.DATABASE_URL,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.ONEHUB_E2E_TEST_MODE = "1";
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.ONEHUB_E2E_TEST_MODE = originalEnv.ONEHUB_E2E_TEST_MODE;
  process.env.DATABASE_URL = originalEnv.DATABASE_URL;
});

describe("payment e2e route safety gate", () => {
  it("refuses destructive payment e2e actions against a shared preview database", async () => {
    process.env.DATABASE_URL = "postgresql://preview-user:secret@db.preview.example.com/onehub_preview?schema=public";

    const response = await POST(new Request("http://onehub.test/api/e2e/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    }) as never);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "E2E payment route requires an isolated local e2e database" });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.refundRequest.updateMany).not.toHaveBeenCalled();
  });

  it("allows payment e2e actions only when the database URL is explicitly local e2e", async () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54329/onehub_e2e?schema=public";
    prisma.user.findMany.mockResolvedValue([]);
    prisma.organization.findMany.mockResolvedValue([]);
    prisma.proposal.findMany.mockResolvedValue([]);
    prisma.event.findMany.mockResolvedValue([]);
    prisma.paymentIntent.findMany.mockResolvedValue([]);
    for (const model of Object.values(prisma)) {
      if ("deleteMany" in model) model.deleteMany.mockResolvedValue({ count: 0 });
    }
    prisma.user.create
      .mockResolvedValueOnce({ id: "buyer-1" })
      .mockResolvedValueOnce({ id: "seller-1" })
      .mockResolvedValueOnce({ id: "slice5-e2e-admin" });
    prisma.organization.create
      .mockResolvedValueOnce({ id: "buyer-org-1" })
      .mockResolvedValueOnce({ id: "seller-org-1" });
    prisma.event.create.mockResolvedValue({ id: "event-1" });
    prisma.listing.create.mockResolvedValue({ id: "listing-1" });
    prisma.proposal.create.mockResolvedValue({ id: "proposal-1" });
    prisma.paymentMilestone.create.mockResolvedValue({ id: "milestone-1", amountCents: 120000 });
    prisma.contract.create.mockResolvedValue({ id: "contract-1" });
    prisma.escrowAccount.create.mockResolvedValue({ id: "escrow-1" });
    prisma.membership.createMany.mockResolvedValue({ count: 2 });
    prisma.proposalLineItem.create.mockResolvedValue({});
    prisma.signature.createMany.mockResolvedValue({ count: 2 });

    const response = await POST(new Request("http://onehub.test/api/e2e/payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    }) as never);

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalled();
  });
});
