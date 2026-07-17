import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    refundRequest: { findFirst: vi.fn() },
    dispute: { findFirst: vi.fn() },
    paymentHoldback: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: vi.fn() }));
vi.mock("@/lib/fee-profile", () => ({ resolveFeeProfile: vi.fn() }));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/admin-override", () => ({
  feeOverrideRequiresAdminOverride: vi.fn(() => false),
  recordAdminOverride: vi.fn(),
}));
vi.mock("@/lib/rbac", () => ({
  getGuardedMvpAuthorityForUserId: vi.fn(),
  isPlatformAdminForGuardedMvp: vi.fn(() => true),
}));

import { getBlockingDisputeCase } from "../src/lib/dispute-case";
import { getBlockingHoldbackForMilestone } from "../src/lib/holdback";
import { hasBlockingRefundRequest } from "../src/lib/refund-request";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.refundRequest.findFirst.mockResolvedValue(null);
  prisma.dispute.findFirst.mockResolvedValue(null);
  prisma.paymentHoldback.findFirst.mockResolvedValue(null);
});

describe("payment release blocking helpers", () => {
  it("treats only OPEN refund requests as release blockers", async () => {
    const blocker = { id: "refund-open-1", status: "OPEN" };
    prisma.refundRequest.findFirst.mockResolvedValueOnce(blocker);

    await expect(hasBlockingRefundRequest("proposal-1", "milestone-1")).resolves.toBe(blocker);
    expect(prisma.refundRequest.findFirst).toHaveBeenCalledWith({
      where: {
        proposalId: "proposal-1",
        status: "OPEN",
        OR: [{ milestoneId: "milestone-1" }, { milestoneId: null }],
      },
      orderBy: { createdAt: "desc" },
    });

    for (const status of ["APPROVED", "DENIED", "CANCELED"] as const) {
      prisma.refundRequest.findFirst.mockResolvedValueOnce(null);
      await expect(hasBlockingRefundRequest("proposal-1", "milestone-1")).resolves.toBeNull();
      expect(prisma.refundRequest.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" }),
      }));
      expect(prisma.refundRequest.findFirst.mock.calls.at(-1)?.[0].where.status).not.toBe(status);
    }
  });

  it("treats only open dispute workflow statuses as release blockers", async () => {
    const blocker = { id: "dispute-open-1", status: "ESCALATED", freezeState: "ADMIN_REVIEW" };
    prisma.dispute.findFirst.mockResolvedValueOnce(blocker);

    await expect(getBlockingDisputeCase("proposal-1", "milestone-1")).resolves.toBe(blocker);
    expect(prisma.dispute.findFirst).toHaveBeenCalledWith({
      where: {
        proposalId: "proposal-1",
        status: { in: ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] },
        OR: [{ milestoneId: "milestone-1" }, { milestoneId: null }],
      },
      orderBy: { createdAt: "desc" },
    });

    for (const status of ["RESOLVED_SELLER_FAVOR", "RESOLVED_REFUND"] as const) {
      prisma.dispute.findFirst.mockResolvedValueOnce(null);
      await expect(getBlockingDisputeCase("proposal-1", "milestone-1")).resolves.toBeNull();
      expect(prisma.dispute.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] } }),
      }));
      expect(prisma.dispute.findFirst.mock.calls.at(-1)?.[0].where.status.in).not.toContain(status);
    }
  });

  it("treats only ACTIVE holdbacks as release blockers", async () => {
    const blocker = { id: "holdback-active-1", state: "ACTIVE" };
    prisma.paymentHoldback.findFirst.mockResolvedValueOnce(blocker);

    await expect(getBlockingHoldbackForMilestone("milestone-1")).resolves.toBe(blocker);
    expect(prisma.paymentHoldback.findFirst).toHaveBeenCalledWith({
      where: {
        milestoneId: "milestone-1",
        state: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
    });

    for (const state of ["RELEASED", "NONE"] as const) {
      prisma.paymentHoldback.findFirst.mockResolvedValueOnce(null);
      await expect(getBlockingHoldbackForMilestone("milestone-1")).resolves.toBeNull();
      expect(prisma.paymentHoldback.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
        where: expect.objectContaining({ state: "ACTIVE" }),
      }));
      expect(prisma.paymentHoldback.findFirst.mock.calls.at(-1)?.[0].where.state).not.toBe(state);
    }
  });
});
