import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

const { getCurrentUser, notFound, prisma, canManageEvent, canViewProposalResource, canViewContractResource } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  prisma: {
    proposal: { findUnique: vi.fn() },
    contract: { findUnique: vi.fn() },
    thread: { findFirst: vi.fn() },
  },
  canManageEvent: vi.fn(),
  canViewProposalResource: vi.fn(),
  canViewContractResource: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/rbac", () => ({ canManageEvent, canViewProposalResource, canViewContractResource }));
vi.mock("@onehub/ui", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  LineItemsTable: () => <div>line items</div>,
  Money: ({ cents, currency }: { cents: number; currency: string }) => <span>{currency}:{cents}</span>,
  ThreadPanel: () => <div>thread</div>,
  TotalsSummary: () => <div>totals</div>,
}));
vi.mock("@/components/contracts/GenerateContractButton", () => ({ GenerateContractButton: () => <button>generate</button> }));
vi.mock("@/components/proposals/ApproveProposalButton", () => ({ ApproveProposalButton: () => <button>approve</button> }));
vi.mock("@/components/proposals/ProposalPageClient", () => ({
  ProposalPageClient: ({ proposal }: { proposal: { id: string } }) => <div>proposal:{proposal.id}</div>,
}));
vi.mock("@/components/contracts/ContractPageClient", () => ({
  ContractPageClient: ({ contract }: { contract: { id: string } }) => <div>contract:{contract.id}</div>,
}));

import ProposalPage from "../src/app/(app)/proposals/[id]/page";
import ContractPage from "../src/app/(app)/contracts/[id]/page";
import FundProposalPage from "../src/app/(app)/proposals/[id]/fund/page";

const user = { id: "user-unrelated", email: "outsider@example.com", role: "DIY_PLANNER" };
const event = {
  id: "event-1",
  slug: "event-one",
  orgId: "buyer-org",
  createdById: "planner-1",
  org: {
    ownerId: "buyer-owner",
    owner: { id: "buyer-owner" },
    members: [{ userId: "buyer-member" }],
  },
};
const listing = {
  id: "listing-1",
  title: "Vendor Listing",
  type: "VENUE",
  category: "VENUE",
  orgId: "seller-org",
  org: { ownerId: "seller-owner", members: [{ userId: "seller-member" }] },
};
const proposal = {
  id: "proposal-1",
  title: "Private proposal",
  summary: "private",
  status: "SENT",
  currency: "USD",
  lineItems: [],
  milestones: [],
  contract: null,
  escrowAccount: null,
  event,
  listing,
  sections: [],
};
const contract = {
  id: "contract-1",
  title: "Private contract",
  status: "OUT_FOR_SIGNATURE",
  buyerId: "buyer-org",
  sellerId: "seller-org",
  signatures: [],
  proposal: { ...proposal, milestones: [], listing, event },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue(user);
  prisma.proposal.findUnique.mockResolvedValue(proposal);
  prisma.contract.findUnique.mockResolvedValue(contract);
  prisma.thread.findFirst.mockResolvedValue(null);
  canManageEvent.mockReturnValue(false);
  canViewProposalResource.mockReturnValue(true);
  canViewContractResource.mockReturnValue(true);
});

describe("proposal, contract, and funding read guards", () => {
  it("blocks unrelated authenticated users from proposal detail by direct id", async () => {
    canViewProposalResource.mockReturnValue(false);

    await expect(ProposalPage({ params: Promise.resolve({ id: "proposal-1" }) })).rejects.toThrow("notFound");

    expect(canViewProposalResource).toHaveBeenCalledWith(user, proposal);
    expect(prisma.thread.findFirst).not.toHaveBeenCalled();
  });

  it("allows authorized users to view proposal detail", async () => {
    const page = await ProposalPage({ params: Promise.resolve({ id: "proposal-1" }) });

    expect(page).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
    expect(canViewProposalResource).toHaveBeenCalledWith(user, proposal);
  });

  it("blocks unrelated authenticated users from contract detail by direct id", async () => {
    canViewContractResource.mockReturnValue(false);

    await expect(ContractPage({ params: Promise.resolve({ id: "contract-1" }) })).rejects.toThrow("notFound");

    expect(canViewContractResource).toHaveBeenCalledWith(user, contract);
  });

  it("blocks unrelated authenticated users from funding detail by direct proposal id", async () => {
    canViewProposalResource.mockReturnValue(false);

    await expect(FundProposalPage({ params: Promise.resolve({ id: "proposal-1" }) })).rejects.toThrow("notFound");

    expect(canViewProposalResource).toHaveBeenCalledWith(user, proposal);
  });
});
