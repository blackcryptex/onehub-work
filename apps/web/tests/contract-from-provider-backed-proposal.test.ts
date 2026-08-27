import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCurrentUser, canManageEvent, prisma, generateContractFromProposal } = vi.hoisted(() => {
  const prisma = {
    proposal: { findUnique: vi.fn(), update: vi.fn() },
    contract: { findUnique: vi.fn(), create: vi.fn() },
    activity: { findFirst: vi.fn() },
  };

  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    canManageEvent: vi.fn(),
    prisma,
    generateContractFromProposal: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));
vi.mock("@/lib/ai/generateContract", () => ({ generateContractFromProposal }));
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "MARKETPLACE" }));
vi.mock("@/lib/fee-profile", () => ({
  resolveFeeProfile: () => ({
    platformFeePercent: 5,
    hooks: {
      legalSurface: "proposal.marketplace",
      acceptanceSurface: "proposal.approve",
    },
  }),
}));

import { POST } from "../src/app/api/contracts/from-proposal/route";

function request() {
  return new Request("http://onehub.test/api/contracts/from-proposal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proposalId: "proposal-1" }),
  }) as never;
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "proposal-1",
    orgId: "planner-org-1",
    eventId: "event-1",
    listingId: "listing-1",
    title: "Provider floral proposal",
    summary: "Provider-submitted quote from Avery Florals.",
    terms: "Provider quote terms",
    status: "ACCEPTED",
    currency: "USD",
    totalCents: 250000,
    bookingClassification: "MARKETPLACE",
    event: {
      id: "event-1",
      orgId: "planner-org-1",
      name: "Smith Wedding Weekend",
      startAt: new Date("2027-06-14T17:00:00.000Z"),
      endAt: new Date("2027-06-15T02:00:00.000Z"),
      venueCity: "Austin",
      venueState: "TX",
      venueCountry: "US",
      guestTarget: 150,
      org: {
        id: "planner-org-1",
        name: "Maya Events",
        members: [{ userId: "planner-1", role: "OWNER" }],
        owner: { name: "Maya Planner", email: "maya@example.com" },
      },
      createdBy: { name: "Maya Planner", email: "maya@example.com" },
    },
    listing: {
      id: "listing-1",
      orgId: "provider-org-1",
      title: "Avery Florals",
      type: "VENDOR",
      category: "DECOR_FLORAL",
      email: "sales@avery.test",
      phone: null,
      org: { id: "provider-org-1", name: "Avery Florals LLC", contactEmail: "owner@avery.test", contactPhone: null },
    },
    lineItems: [{ label: "Floral package", qty: 1, unit: "quote", unitPriceCents: 250000, totalCents: 250000 }],
    milestones: [{ title: "Provider quote total", amountCents: 250000, dueType: "OFFSET_FROM_EVENT_START", dueOffsetDays: -14 }],
    ...overrides,
  };
}

describe("contract generation from provider-backed proposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "planner-1" } });
    getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER" });
    canManageEvent.mockReturnValue(true);
    prisma.proposal.findUnique.mockResolvedValue(proposal());
    prisma.contract.findUnique.mockResolvedValue(null);
    prisma.activity.findFirst.mockResolvedValue({ id: "activity-provider-submitted" });
    prisma.contract.create.mockResolvedValue({ id: "contract-1", status: "DRAFT" });
    prisma.proposal.update.mockResolvedValue({ id: "proposal-1", status: "CONVERTED" });
    generateContractFromProposal.mockResolvedValue({ title: "Contract for Provider floral proposal", bodyMd: "# Contract" });
  });

  it("blocks accepted proposals that lack provider-submitted evidence", async () => {
    prisma.activity.findFirst.mockResolvedValue(null);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Proposal is missing provider-submitted evidence and cannot be converted into a contract." });
    expect(generateContractFromProposal).not.toHaveBeenCalled();
    expect(prisma.contract.create).not.toHaveBeenCalled();
  });

  it("creates a draft contract only for accepted provider-backed proposals", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ id: "contract-1", status: "DRAFT" }));
    expect(prisma.activity.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: "PROVIDER_PROPOSAL_SUBMITTED",
        target: "proposal-1",
      }),
    }));
    expect(prisma.contract.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        proposalId: "proposal-1",
        buyerId: "planner-org-1",
        sellerId: "provider-org-1",
      }),
    }));
  });
});
