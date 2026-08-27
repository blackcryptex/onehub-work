import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, auth, prisma, recordActivity, logger, trackError } = vi.hoisted(() => {
  const prisma = {
    proposal: { findUniqueOrThrow: vi.fn(), update: vi.fn(), create: vi.fn() },
    activity: { findFirst: vi.fn() },
    contract: { create: vi.fn() },
    escrowAccount: { create: vi.fn() },
  };

  return {
    getCurrentUser: vi.fn(),
    auth: vi.fn(),
    prisma,
    recordActivity: vi.fn(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    trackError: vi.fn(),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser,
  isAdmin: (user?: { role?: string | null }) => user?.role === "ADMIN",
}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/server/lib/activity", () => ({
  ACTIVITY_ACTIONS: { PROPOSAL_REJECTED: "PROPOSAL_REJECTED" },
  recordActivity,
}));
vi.mock("@/lib/logger", () => ({ logger }));
vi.mock("@/lib/errorTracker", () => ({ trackError }));

import { proposalRouter } from "../src/server/routers/proposal";

function caller() {
  return proposalRouter.createCaller({});
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "proposal-1",
    eventId: "event-1",
    orgId: "buyer-org-1",
    listingId: "listing-1",
    title: "Provider proposal",
    status: "SENT",
    currency: "USD",
    lineItems: [
      { id: "line-1", totalCents: 10000 },
      { id: "line-2", totalCents: 2500 },
    ],
    event: {
      id: "event-1",
      orgId: "buyer-org-1",
      createdById: "planner-1",
      org: { ownerId: "buyer-owner-1", members: [{ userId: "buyer-member-1" }] },
      stakeholders: [{ userId: "client-1", role: "CLIENT" }],
      shares: [{ viewerUserId: "client-1", scope: "SUMMARY" }],
    },
    listing: {
      id: "listing-1",
      orgId: "seller-org-1",
      org: { ownerId: "seller-owner-1", members: [{ userId: "seller-member-1" }] },
    },
    ...overrides,
  };
}

function user(id: string, role: string, email = `${id}@test.local`) {
  return { id, role, email };
}

describe("proposal.calculateTotals commercial access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "buyer-member-1" } });
    getCurrentUser.mockResolvedValue(user("buyer-member-1", "PRO_PLANNER"));
    prisma.proposal.findUniqueOrThrow.mockResolvedValue(proposal());
  });

  it("rejects unauthenticated users before reading proposal totals", async () => {
    getCurrentUser.mockResolvedValue(null);

    await expect(caller().calculateTotals({ proposalId: "proposal-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(prisma.proposal.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects unrelated authenticated users", async () => {
    getCurrentUser.mockResolvedValue(user("stranger-1", "VENUE"));

    await expect(caller().calculateTotals({ proposalId: "proposal-1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have permission to access this proposal",
    });
  });

  it("allows buyer org members to calculate totals", async () => {
    await expect(caller().calculateTotals({ proposalId: "proposal-1" })).resolves.toEqual({
      subtotalCents: 12500,
      taxCents: 0,
      totalCents: 12500,
    });
  });

  it("allows shared client stakeholders to calculate totals", async () => {
    getCurrentUser.mockResolvedValue(user("client-1", "CLIENT"));

    await expect(caller().calculateTotals({ proposalId: "proposal-1" })).resolves.toEqual({
      subtotalCents: 12500,
      taxCents: 0,
      totalCents: 12500,
    });
  });

  it("allows seller listing org members to calculate totals", async () => {
    getCurrentUser.mockResolvedValue(user("seller-member-1", "VENDOR"));

    await expect(caller().calculateTotals({ proposalId: "proposal-1" })).resolves.toEqual({
      subtotalCents: 12500,
      taxCents: 0,
      totalCents: 12500,
    });
  });
});
