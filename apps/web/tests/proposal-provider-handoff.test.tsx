import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const {
  auth,
  getCurrentUser,
  canManageEvent,
  prisma,
  recordAcceptance,
} = vi.hoisted(() => {
  const prisma = {
    proposal: { findUnique: vi.fn(), update: vi.fn() },
    activity: { findFirst: vi.fn() },
    contract: { create: vi.fn() },
    escrowAccount: { create: vi.fn() },
  };
  return {
    auth: vi.fn(),
    getCurrentUser: vi.fn(),
    canManageEvent: vi.fn(),
    prisma,
    recordAcceptance: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/rbac", () => ({ canManageEvent }));
vi.mock("@/lib/acceptance", async () => {
  const { z } = await import("zod");
  return {
    acceptanceInputSchema: z.object({ legalVersion: z.string() }).passthrough(),
    CURRENT_ACCEPTANCE_VERSIONS: { proposal: "proposal-v1" },
    recordAcceptance,
  };
});
vi.mock("@/lib/booking-classification", () => ({ resolveBookingClassification: () => "MARKETPLACE" }));
vi.mock("@/lib/legal-surface", () => ({
  getLegalSurface: () => "proposal.marketplace",
  PUBLIC_LEGAL_PAGES: { terms: "/legal/terms" },
}));
vi.mock("@/components/contracts/GenerateContractButton", () => ({ GenerateContractButton: () => <button>Generate Contract</button> }));
vi.mock("@/components/proposals/ApproveProposalButton", () => ({ ApproveProposalButton: () => <button>Approve Proposal</button> }));
vi.mock("@/components/proposals/ProposalEditor", () => ({ ProposalEditor: () => <div>Proposal editor</div> }));
vi.mock("@/components/proposals/DeleteProposalButton", () => ({ DeleteProposalButton: () => <button>Delete Proposal</button> }));
vi.mock("@/components/legal/LegalNotice", () => ({ LegalNotice: () => <div>Legal notice</div> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@onehub/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
    LineItemsTable: () => <div>Line items</div>,
    TotalsSummary: () => <div>Totals</div>,
    ThreadPanel: () => <div>Thread</div>,
  };
});

import { POST } from "../src/app/api/proposals/[id]/approve/route";
import { ProposalPageClient } from "../src/components/proposals/ProposalPageClient";

const params = { params: Promise.resolve({ id: "proposal-1" }) };

function request() {
  return new Request("http://onehub.test/api/proposals/proposal-1/approve", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "test-request" },
    body: JSON.stringify({ acceptance: { legalVersion: "proposal-v1" } }),
  }) as never;
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
    totalCents: 250000,
    bookingClassification: "MARKETPLACE",
    event: {
      id: "event-1",
      orgId: "org-1",
      name: "Smith Wedding Weekend",
      org: { type: "PLANNER", members: [{ userId: "planner-1", role: "OWNER" }] },
    },
    org: { id: "org-1" },
    listing: { id: "listing-1", title: "Avery Florals", type: "VENDOR" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "planner-1" } });
  getCurrentUser.mockResolvedValue({ id: "planner-1", role: "PRO_PLANNER" });
  canManageEvent.mockReturnValue(true);
  prisma.proposal.findUnique.mockResolvedValue(proposal());
  prisma.proposal.update.mockResolvedValue(proposal({ status: "ACCEPTED" }));
  prisma.activity.findFirst.mockResolvedValue({ id: "activity-provider-submitted" });
  prisma.contract.create.mockResolvedValue({ id: "contract-1" });
  prisma.escrowAccount.create.mockResolvedValue({ id: "escrow-1" });
  recordAcceptance.mockResolvedValue({ id: "acceptance-1" });
});

describe("provider-backed proposal approval guard", () => {
  it("rejects draft proposals before creating contract, escrow, or acceptance records", async () => {
    prisma.proposal.findUnique.mockResolvedValue(proposal({ status: "DRAFT" }));

    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Only provider-submitted proposals with listing context can be approved" });
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(prisma.contract.create).not.toHaveBeenCalled();
    expect(prisma.escrowAccount.create).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
  });

  it("rejects sent proposals that lack listing/provider context", async () => {
    prisma.proposal.findUnique.mockResolvedValue(proposal({ listingId: null, listing: null }));

    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Only provider-submitted proposals with listing context can be approved" });
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
  });

  it("rejects planner-sent proposals without provider-submitted evidence", async () => {
    prisma.activity.findFirst.mockResolvedValue(null);

    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Only provider-submitted proposals with listing context can be approved" });
    expect(prisma.proposal.update).not.toHaveBeenCalled();
    expect(recordAcceptance).not.toHaveBeenCalled();
  });

  it("approves a sent provider-backed proposal with listing context", async () => {
    const response = await POST(request(), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ACCEPTED");
    expect(prisma.activity.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        action: "PROVIDER_PROPOSAL_SUBMITTED",
        target: "proposal-1",
      }),
    }));
    expect(prisma.proposal.update).toHaveBeenCalledWith({ where: { id: "proposal-1" }, data: { status: "ACCEPTED" } });
    expect(recordAcceptance).toHaveBeenCalledWith(expect.objectContaining({ proposalId: "proposal-1" }));
  });
});

describe("proposal detail provider-backed status copy", () => {
  it("does not render approval controls for draft/generated proposals", () => {
    render(
      <ProposalPageClient
        proposal={{
          ...proposal({ status: "DRAFT", listingId: null, listing: null }),
          lineItems: [],
          milestones: [],
          sections: [],
          contract: null,
          summary: "AI generated draft",
        }}
        eventVaultHref="/pro/planner/vault/smith-wedding-weekend"
        hasContent
        canEdit
        thread={null}
      />,
    );

    expect(screen.getByText("Status: DRAFT")).toBeInTheDocument();
    expect(screen.getByText(/Draft\/generated\/listing-backed proposal — not provider-backed/i)).toBeInTheDocument();
    expect(screen.queryByText("Approve Proposal")).not.toBeInTheDocument();
  });

  it("locks planner-sent listing-backed proposals without provider evidence", () => {
    render(
      <ProposalPageClient
        proposal={{
          ...proposal({ providerBackedEvidence: false }),
          lineItems: [],
          milestones: [],
          sections: [],
          contract: null,
          summary: "Planner sent draft against a marketplace listing",
        }}
        eventVaultHref="/pro/planner/vault/smith-wedding-weekend"
        hasContent
        canEdit
        thread={null}
      />,
    );

    expect(screen.getByText(/Draft\/generated\/listing-backed proposal — not provider-backed/i)).toBeInTheDocument();
    expect(screen.getByText(/provider-submitted proposal evidence/i)).toBeInTheDocument();
    expect(screen.queryByText("Approve Proposal")).not.toBeInTheDocument();
  });

  it("does not expose contract generation for accepted listing-backed proposals without provider evidence", () => {
    render(
      <ProposalPageClient
        proposal={{
          ...proposal({ status: "ACCEPTED", providerBackedEvidence: false }),
          lineItems: [],
          milestones: [],
          sections: [],
          contract: null,
          summary: "Accepted planner draft without provider handoff evidence",
        }}
        eventVaultHref="/pro/planner/vault/smith-wedding-weekend"
        hasContent
        canEdit
        thread={null}
      />,
    );

    expect(screen.getByText("Generate Contract")).toBeInTheDocument();
    expect(screen.getByText(/Contract generation is unavailable until provider-submitted proposal evidence is present/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate Contract" })).not.toBeInTheDocument();
  });

  it("labels provider-backed proposals as vendor-ready", () => {
    render(
      <ProposalPageClient
        proposal={{
          ...proposal({ providerBackedEvidence: true }),
          lineItems: [],
          milestones: [],
          sections: [],
          contract: null,
          summary: "Provider submitted quote",
        }}
        eventVaultHref="/pro/planner/vault/smith-wedding-weekend"
        hasContent
        canEdit
        thread={null}
      />,
    );

    expect(screen.getByText(/Provider-backed proposal — vendor-ready/i)).toBeInTheDocument();
    expect(screen.getAllByText("Approve Proposal").length).toBeGreaterThan(0);
  });
});
