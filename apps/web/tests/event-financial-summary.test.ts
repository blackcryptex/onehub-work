import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/rbac", () => ({
  canManageEvent: (user: { id?: string; role?: string } | null, event: any) =>
    user?.role === "ADMIN" || event?.createdById === user?.id || event?.org?.ownerId === user?.id || event?.org?.members?.some((member: { userId: string }) => member.userId === user?.id),
  canViewBudget: (user: { id?: string; role?: string } | null, event: any) =>
    user?.role === "ADMIN" || event?.org?.ownerId === user?.id || event?.org?.members?.some((member: { userId: string }) => member.userId === user?.id),
  isAdmin: (user: { role?: string } | null) => user?.role === "ADMIN",
}));

import {
  canUserApproveContractChangeOrder,
  computeEventFinancialSummary,
} from "../src/server/lib/event-financial-summary";

const providerSubmitted = new Set(["proposal-accepted", "proposal-pending", "proposal-converted"]);

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1",
    name: "Smith Wedding Weekend",
    slug: "smith-wedding-weekend",
    orgId: "buyer-org-1",
    createdById: "planner-1",
    budgetCents: 500000,
    budgetCurrency: "USD",
    org: { ownerId: "owner-1", members: [{ userId: "planner-1" }] },
    stakeholders: [],
    shares: [],
    budgetLines: [
      { plannedCents: 200000, actualCents: 50000 },
      { plannedCents: 100000, actualCents: 25000 },
    ],
    proposals: [
      {
        id: "proposal-accepted",
        title: "Avery Florals",
        orgId: "buyer-org-1",
        eventId: "event-1",
        listingId: "listing-1",
        listing: { id: "listing-1", title: "Avery Florals" },
        status: "ACCEPTED",
        currency: "USD",
        totalCents: 420000,
        milestones: [
          { id: "m-1", title: "Deposit", amountCents: 120000, status: "IN_ESCROW" },
          { id: "m-2", title: "Final", amountCents: 300000, status: "PENDING" },
        ],
        contract: {
          id: "contract-1",
          title: "Avery Florals Agreement",
          status: "FULLY_SIGNED",
          changeOrders: [
            { id: "co-1", number: 1, title: "Extra install", deltaCents: 90000, status: "APPROVED" },
            { id: "co-2", number: 2, title: "Late pickup", deltaCents: 25000, status: "PENDING" },
            { id: "co-3", number: 3, title: "Rejected idea", deltaCents: 100000, status: "REJECTED" },
          ],
        },
      },
      {
        id: "proposal-pending",
        title: "Lighting vendor",
        orgId: "buyer-org-1",
        eventId: "event-1",
        listingId: "listing-2",
        listing: { id: "listing-2", title: "Lighting vendor" },
        status: "SENT",
        currency: "USD",
        totalCents: 80000,
        milestones: [],
        contract: null,
      },
      {
        id: "proposal-draft",
        title: "Planner draft",
        orgId: "buyer-org-1",
        eventId: "event-1",
        listingId: "listing-3",
        listing: { id: "listing-3", title: "Planner draft" },
        status: "DRAFT",
        currency: "USD",
        totalCents: 999999,
        milestones: [],
        contract: null,
      },
    ],
    ...overrides,
  } as any;
}

describe("event financial summary", () => {
  it("reconciles budget lines, accepted proposals, payments, change orders, and overrun risk", () => {
    const summary = computeEventFinancialSummary(event(), providerSubmitted);

    expect(summary.budgetTotalCents).toBe(500000);
    expect(summary.plannedCents).toBe(300000);
    expect(summary.actualCents).toBe(75000);
    expect(summary.committedCents).toBe(510000);
    expect(summary.pendingProposalExposureCents).toBe(80000);
    expect(summary.approvedChangeOrderDeltaCents).toBe(90000);
    expect(summary.pendingChangeOrderDeltaCents).toBe(25000);
    expect(summary.heldCents).toBe(120000);
    expect(summary.paidCents).toBe(0);
    expect(summary.payableCents).toBe(300000);
    expect(summary.owedCents).toBe(390000);
    expect(summary.overrunCents).toBe(35000);
    expect(summary.riskLevel).toBe("overrun");
    expect(summary.warnings).toContain("Projected committed exposure exceeds the approved event budget.");
  });

  it("excludes non-provider-backed and mixed-currency commitments from the arithmetic", () => {
    const summary = computeEventFinancialSummary(event({
      proposals: [
        { id: "proposal-accepted", title: "No evidence", listingId: "listing-1", listing: { id: "listing-1" }, status: "ACCEPTED", currency: "USD", totalCents: 300000, milestones: [] },
        { id: "proposal-converted", title: "Euro vendor", listingId: "listing-2", listing: { id: "listing-2" }, status: "CONVERTED", currency: "EUR", totalCents: 400000, milestones: [] },
      ],
    }), new Set(["proposal-converted"]));

    expect(summary.committedCents).toBe(0);
    expect(summary.warnings.join(" ")).toMatch(/different currency/);
  });

  it("allows buyer event managers and seller org members to approve change orders, but blocks unrelated users", () => {
    const contract = {
      buyerId: "buyer-org-1",
      sellerId: "seller-org-1",
      proposal: {
        event: event(),
        listing: {
          orgId: "seller-org-1",
          org: { ownerId: "seller-owner-1", members: [{ userId: "seller-member-1" }] },
        },
      },
    };

    expect(canUserApproveContractChangeOrder({ id: "planner-1", role: "PRO_PLANNER" } as any, contract)).toBe(true);
    expect(canUserApproveContractChangeOrder({ id: "seller-member-1", role: "VENDOR" } as any, contract)).toBe(true);
    expect(canUserApproveContractChangeOrder({ id: "stranger-1", role: "VENUE" } as any, contract)).toBe(false);
  });
});
