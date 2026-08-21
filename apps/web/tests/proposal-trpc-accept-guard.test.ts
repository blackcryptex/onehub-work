import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, canManageEvent, canSendProposal, prisma, recordActivity, logger, trackError } = vi.hoisted(() => {
  const prisma = {
    proposal: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    contract: { create: vi.fn() },
    escrowAccount: { create: vi.fn() },
  };

  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    canManageEvent: vi.fn(),
    canSendProposal: vi.fn(),
    prisma,
    recordActivity: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    trackError: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent, canSendProposal }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: { PROPOSAL_REJECTED: "PROPOSAL_REJECTED" },
  recordActivity,
}));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/errorTracker", () => ({ trackError }));

import { proposalRouter } from "../src/server/routers/proposal";

function caller() {
  return proposalRouter.createCaller({ user: { id: "planner-1", role: "PRO_PLANNER" } });
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "proposal-1",
    orgId: "org-1",
    eventId: "event-1",
    listingId: "listing-1",
    title: "Provider floral proposal",
    status: "SENT",
    currency: "USD",
    event: {
      id: "event-1",
      orgId: "org-1",
      org: { members: [{ userId: "planner-1", role: "OWNER" }] },
    },
    org: { id: "org-1" },
    listing: { id: "listing-1", orgId: "provider-org-1" },
    ...overrides,
  };
}

describe("legacy tRPC proposal.accept provider-backed guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "planner-1" } });
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER" });
    canManageEvent.mockReturnValue(true);
    canSendProposal.mockReturnValue(true);
    prisma.proposal.findUniqueOrThrow.mockResolvedValue(proposal());
    prisma.proposal.update.mockResolvedValue(proposal({ status: "ACCEPTED" }));
    prisma.contract.create.mockResolvedValue({ id: "contract-1" });
    prisma.escrowAccount.create.mockResolvedValue({ id: "escrow-1" });
    recordActivity.mockResolvedValue(undefined);
  });

  it("rejects draft proposals before creating contract, escrow, or accepted status", async () => {
    prisma.proposal.findUniqueOrThrow.mockResolvedValue(proposal({ status: "DRAFT" }));

    await expect(caller().accept({ proposalId: "proposal-1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Only provider-submitted proposals with listing context can be approved",
    });

    expect(prisma.contract.create).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.create).not.toHaveBeenCalled();
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("rejects sent proposals that lack listing/provider context before side effects", async () => {
    prisma.proposal.findUniqueOrThrow.mockResolvedValue(proposal({ listingId: null, listing: null }));

    await expect(caller().accept({ proposalId: "proposal-1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Only provider-submitted proposals with listing context can be approved",
    });

    expect(prisma.contract.create).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.create).not.toHaveBeenCalled();
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("accepts provider-backed SENT proposals with listing context", async () => {
    const result = await caller().accept({ proposalId: "proposal-1" });

    expect(result).toEqual(expect.objectContaining({ id: "proposal-1", status: "ACCEPTED" }));
    expect(prisma.contract.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ proposalId: "proposal-1", orgId: "org-1", eventId: "event-1" }),
    }));
    expect(prisma.escrowAccount.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ proposalId: "proposal-1", orgId: "org-1", eventId: "event-1" }),
    }));
    expect(prisma.proposal.update).toHaveBeenCalledWith({ where: { id: "proposal-1" }, data: { status: "ACCEPTED" } });
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "PROPOSAL_ACCEPTED",
      target: "proposal-1",
    }));
  });
});
