import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, canManageEvent, setLocked, getLockMap, prisma } = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(),
    event: { findUnique: vi.fn() },
    proposal: { findFirst: vi.fn() },
    paymentMilestone: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    payout: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    getCurrentUser: vi.fn(),
    canManageEvent: vi.fn(),
    setLocked: vi.fn(),
    getLockMap: vi.fn(async () => ({})),
    prisma: mockPrisma,
  };
});

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));
vi.mock("@/lib/payments/payoutLock", () => ({ setLocked, getLockMap }));

import { POST } from "../src/app/api/payments/lines/route";
import { PATCH, DELETE } from "../src/app/api/payments/lines/[id]/route";
import { POST as autoDepositPOST } from "../src/app/api/payments/deposits/auto/route";

function request(body: Record<string, unknown>, method = "POST") {
  return new Request("http://test.local/api/payments/lines", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const planner = { id: "planner-1", role: "PRO_PLANNER" };
const event = { id: "event-1", orgId: "org-1", org: { members: [{ userId: "planner-1" }] } };
const baseProposal = {
  id: "proposal-1",
  eventId: "event-1",
  orgId: "org-1",
  event,
  contract: { id: "contract-1", status: "FULLY_SIGNED" },
};
const depositLine = {
  id: "line-1",
  proposalId: "proposal-1",
  title: "Client Deposit",
  amountCents: 5000,
  status: "PENDING",
  description: JSON.stringify({ lineType: "deposit" }),
  dueDate: new Date("2026-01-01T00:00:00.000Z"),
  proposal: { event },
};

const params = { params: Promise.resolve({ id: "line-1" }) };

describe("payment lines guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue(planner);
    canManageEvent.mockReturnValue(true);
    prisma.proposal.findFirst.mockResolvedValue(baseProposal);
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it("requires a signed payable contract before creating client payment schedule lines", async () => {
    prisma.proposal.findFirst.mockResolvedValueOnce({ ...baseProposal, contract: null });

    const response = await POST(request({
      mode: "deposit",
      label: "Client Deposit",
      amountCents: 5000,
      eventId: "event-1",
      proposalId: "proposal-1",
      orgId: "org-1",
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Client payment schedule lines require a signed payable contract" });
    expect(prisma.paymentMilestone.create).not.toHaveBeenCalled();
    expect(prisma.payout.create).not.toHaveBeenCalled();
  });

  it("creates only schedule metadata lines after event authority and signed-contract checks", async () => {
    prisma.paymentMilestone.create.mockResolvedValueOnce({ id: "line-1" });

    const response = await POST(request({
      mode: "deposit",
      label: " Client Deposit ",
      amountCents: 5000,
      eventId: "event-1",
      proposalId: "proposal-1",
      orgId: "org-1",
    }));

    expect(response.status).toBe(200);
    expect(prisma.paymentMilestone.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        proposalId: "proposal-1",
        title: "Client Deposit",
        description: JSON.stringify({ lineType: "deposit" }),
        amountCents: 5000,
        status: "PENDING",
      }),
    });
    expect(prisma.payout.create).not.toHaveBeenCalled();
  });

  it("blocks edits to paid client payment schedule lines", async () => {
    prisma.paymentMilestone.findUnique.mockResolvedValueOnce({ ...depositLine, status: "PAID" });

    const response = await PATCH(request({ amountCents: 6000 }, "PATCH"), params);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Paid, held, escrowed, or refunded payment lines cannot be edited" });
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
  });

  it("blocks deletes of escrowed client payment schedule lines", async () => {
    prisma.paymentMilestone.findUnique.mockResolvedValueOnce({ ...depositLine, status: "IN_ESCROW" });

    const response = await DELETE(new Request("http://test.local/api/payments/lines/line-1", { method: "DELETE" }) as never, params);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Paid, held, escrowed, or refunded payment lines cannot be deleted" });
    expect(prisma.paymentMilestone.delete).not.toHaveBeenCalled();
  });

  it("blocks edits and cancellation of non-pending payout lines", async () => {
    prisma.paymentMilestone.findUnique.mockResolvedValue(null);
    prisma.payout.findUnique.mockResolvedValue({
      id: "payout-1",
      proposalId: "proposal-1",
      milestoneId: null,
      listingId: "listing-1",
      amountCents: 5000,
      status: "SENT",
      proposal: { totalCents: 5000, event },
    });

    const patchResponse = await PATCH(request({ amountCents: 7000 }, "PATCH"), params);
    expect(patchResponse.status).toBe(409);

    const deleteResponse = await DELETE(new Request("http://test.local/api/payments/lines/payout-1", { method: "DELETE" }) as never, params);
    expect(deleteResponse.status).toBe(409);
    expect(prisma.payout.update).not.toHaveBeenCalled();
  });

  it("validates payout patch fields before mutating lock state", async () => {
    prisma.paymentMilestone.findUnique.mockResolvedValue(null);
    prisma.payout.findUnique.mockResolvedValue({
      id: "payout-1",
      proposalId: "proposal-1",
      milestoneId: null,
      listingId: "listing-1",
      amountCents: 5000,
      status: "PENDING",
      proposal: { totalCents: 5000, event },
    });

    const response = await PATCH(
      request({ lockedToProposal: true, payeeListingId: "" }, "PATCH"),
      params
    );

    expect(response.status).toBe(400);
    expect(setLocked).not.toHaveBeenCalled();
    expect(prisma.payout.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("preflights auto deposit rebuild before any schedule write", async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      orgId: "org-1",
      org: { members: [{ userId: "planner-1" }] },
      proposals: [{
        id: "proposal-1",
        contract: { id: "contract-1", status: "FULLY_SIGNED" },
        milestones: [],
      }],
    });
    prisma.payout.findMany.mockResolvedValue([{ amountCents: 10000, status: "PENDING" }]);
    prisma.paymentMilestone.findMany
      .mockResolvedValueOnce([{ ...depositLine, title: "Client Deposit", status: "PENDING" }])
      .mockResolvedValueOnce([{ ...depositLine, id: "line-2", title: "Mid Payment", status: "PAID" }])
      .mockResolvedValueOnce([]);

    const response = await autoDepositPOST(request({ eventId: "event-1", mode: "THREE" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Paid, held, escrowed, or refunded payment schedule lines cannot be rebuilt" });
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.create).not.toHaveBeenCalled();
  });

  it("blocks auto deposit rebuild when duplicate same-title metadata includes a paid line", async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: "event-1",
      orgId: "org-1",
      org: { members: [{ userId: "planner-1" }] },
      proposals: [{
        id: "proposal-1",
        contract: { id: "contract-1", status: "FULLY_SIGNED" },
        milestones: [],
      }],
    });
    prisma.payout.findMany.mockResolvedValue([{ amountCents: 10000, status: "PENDING" }]);
    prisma.paymentMilestone.findMany
      .mockResolvedValueOnce([
        { ...depositLine, id: "line-1", title: "Client Deposit", status: "PENDING" },
        { ...depositLine, id: "line-dup-paid", title: "Client Deposit", status: "PAID" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await autoDepositPOST(request({ eventId: "event-1", mode: "THREE" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Paid, held, escrowed, or refunded payment schedule lines cannot be rebuilt" });
    expect(prisma.paymentMilestone.update).not.toHaveBeenCalled();
    expect(prisma.paymentMilestone.create).not.toHaveBeenCalled();
  });
});
