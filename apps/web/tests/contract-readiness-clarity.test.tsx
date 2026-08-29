import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@/components/contracts/ContractEditor", () => ({
  ContractEditor: () => <div>Contract editor</div>,
}));
vi.mock("@/components/contracts/ContractSignatureForm", () => ({
  ContractSignatureForm: () => <div>Signature form ready</div>,
}));
vi.mock("@/components/payments/ContractPaymentPanel", () => ({
  ContractPaymentPanel: () => <div>Payment panel ready</div>,
}));
vi.mock("@/components/legal/LegalNotice", () => ({
  LegalNotice: () => <div>Legal notice</div>,
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ContractPageClient } from "../src/components/contracts/ContractPageClient";

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    proposalId: "proposal-1",
    orgId: "org-1",
    eventId: "event-1",
    title: "Avery Florals Agreement",
    bodyMd: "Agreement body",
    status: "DRAFT",
    buyerId: "buyer-org-1",
    sellerId: "seller-org-1",
    platformFeePercent: 5,
    buyerSideSigned: false,
    sellerSideSigned: false,
    signatures: [],
    changeOrders: [],
    proposal: {
      id: "proposal-1",
      status: "CONVERTED",
      currency: "USD",
      providerBackedEvidence: true,
      event: { name: "Smith Wedding Weekend" },
      listing: { title: "Avery Florals", type: "VENDOR" },
    },
    milestones: [
      {
        id: "milestone-1",
        proposalId: "proposal-1",
        title: "Deposit",
        dueType: "DATE_ABSOLUTE",
        dueDate: null,
        amountCents: 100000,
        status: "PENDING",
      },
    ],
    ...overrides,
  };
}

function renderContract(overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  return render(
    <ContractPageClient
      contract={contract(overrides)}
      eventVaultHref="/pro/planner/vault/smith-wedding-weekend"
      canEdit={false}
      canEnterPayment={false}
      {...props}
    />,
  );
}

describe("contract delivery and signature readiness clarity", () => {
  it("presents provider-backed generated drafts as a safe agreement step and keeps payment locked", () => {
    renderContract();

    expect(screen.getByText(/Status: Draft agreement — ready to review and sign \(DRAFT\)/i)).toBeInTheDocument();
    expect(screen.getByText(/generated from an accepted provider-backed proposal/i)).toBeInTheDocument();
    expect(screen.getByText("Who signs next")).toBeInTheDocument();
    expect(screen.getByText(/Planner\/client\/buyer side and Vendor\/venue\/seller side/i)).toBeInTheDocument();
    expect(screen.getByText("Payment gate")).toBeInTheDocument();
    expect(screen.getByText(/Payment locked until provider-backed proposal evidence, accepted proposal state, and both contract signatures are complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enter payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Payment panel ready")).not.toBeInTheDocument();
    expect(screen.getByText("Signature form ready")).toBeInTheDocument();
  });

  it("explains the remaining side for partially signed contracts", () => {
    renderContract({
      status: "PARTIALLY_SIGNED",
      buyerSideSigned: true,
      sellerSideSigned: false,
      signatures: [
        {
          id: "signature-1",
          signerName: "Pat Planner",
          signerEmail: "pat@example.com",
          signedAt: "2027-01-01T00:00:00.000Z",
          signerSide: "buyer",
        },
      ],
    });

    expect(screen.getByText(/Status: Partially signed \(PARTIALLY_SIGNED\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendor\/venue\/seller side/i)).toBeInTheDocument();
    expect(screen.getByText("Planner/client/buyer side")).toBeInTheDocument();
    expect(screen.queryByText("Payment panel ready")).not.toBeInTheDocument();
  });

  it("only opens payment entry when the contract is fully signed and buyer-side payment access is present", () => {
    renderContract(
      {
        status: "FULLY_SIGNED",
        buyerSideSigned: true,
        sellerSideSigned: true,
        signatures: [
          {
            id: "signature-1",
            signerName: "Pat Planner",
            signerEmail: "pat@example.com",
            signedAt: "2027-01-01T00:00:00.000Z",
            signerSide: "buyer",
          },
          {
            id: "signature-2",
            signerName: "Sam Seller",
            signerEmail: "sam@example.com",
            signedAt: "2027-01-02T00:00:00.000Z",
            signerSide: "seller",
          },
        ],
      },
      { canEnterPayment: true },
    );

    expect(screen.getByText(/Status: Fully signed — payment-ready \(FULLY_SIGNED\)/i)).toBeInTheDocument();
    expect(screen.getByText(/accepted provider-backed proposal contract/i)).toBeInTheDocument();
    expect(screen.getByText(/does not approve live release or bypass manual trust review/i)).toBeInTheDocument();
    expect(screen.getByText(/No signature needed/i)).toBeInTheDocument();
    expect(screen.getByText("Payment entry available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Enter payment/i })).toBeInTheDocument();
    expect(screen.getByText("Payment panel ready")).toBeInTheDocument();
    expect(screen.queryByText("Signature form ready")).not.toBeInTheDocument();
  });

  it("keeps payment entry locked for a fully signed contract without accepted provider-backed proposal state", () => {
    renderContract(
      {
        status: "FULLY_SIGNED",
        buyerSideSigned: true,
        sellerSideSigned: true,
        proposal: {
          id: "proposal-1",
          status: "SENT",
          currency: "USD",
          providerBackedEvidence: false,
          event: { name: "Smith Wedding Weekend" },
          listing: { title: "Avery Florals", type: "VENDOR" },
        },
        signatures: [
          {
            id: "signature-1",
            signerName: "Pat Planner",
            signerEmail: "pat@example.com",
            signedAt: "2027-01-01T00:00:00.000Z",
            signerSide: "buyer",
          },
          {
            id: "signature-2",
            signerName: "Sam Seller",
            signerEmail: "sam@example.com",
            signedAt: "2027-01-02T00:00:00.000Z",
            signerSide: "seller",
          },
        ],
      },
      { canEnterPayment: true },
    );

    expect(screen.getByText(/Payment locked until provider-backed proposal evidence, accepted proposal state, and both contract signatures are complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enter payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Payment panel ready")).not.toBeInTheDocument();
  });

  it("keeps payment entry locked for converted listing-backed contracts without provider evidence", () => {
    renderContract(
      {
        status: "FULLY_SIGNED",
        buyerSideSigned: true,
        sellerSideSigned: true,
        proposal: {
          id: "proposal-1",
          status: "CONVERTED",
          currency: "USD",
          providerBackedEvidence: false,
          event: { name: "Smith Wedding Weekend" },
          listing: { title: "Avery Florals", type: "VENDOR" },
        },
        signatures: [
          {
            id: "signature-1",
            signerName: "Pat Planner",
            signerEmail: "pat@example.com",
            signedAt: "2027-01-01T00:00:00.000Z",
            signerSide: "buyer",
          },
          {
            id: "signature-2",
            signerName: "Sam Seller",
            signerEmail: "sam@example.com",
            signedAt: "2027-01-02T00:00:00.000Z",
            signerSide: "seller",
          },
        ],
      },
      { canEnterPayment: true },
    );

    expect(screen.getByText(/Payment locked until provider-backed proposal evidence/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enter payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Payment panel ready")).not.toBeInTheDocument();
  });

  it("renders change-order budget impact without claiming live payment movement", () => {
    renderContract({
      changeOrders: [
        { id: "co-1", number: 1, title: "Extra install", bodyMd: "Adds late-night installation.", deltaCents: 90000, status: "APPROVED", approvedAt: "2027-01-03T00:00:00.000Z" },
        { id: "co-2", number: 2, title: "Late pickup", bodyMd: "Pending pickup decision.", deltaCents: 25000, status: "PENDING" },
      ],
    });

    expect(screen.getByText("Change orders")).toBeInTheDocument();
    expect(screen.getByText(/Approved change orders increase committed budget exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/CO #1: Extra install/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved • \$900.00/i)).toBeInTheDocument();
    expect(screen.getByText(/CO #2: Late pickup/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending • \$250.00/i)).toBeInTheDocument();
    expect(screen.getByText(/risk only and do not change payable, held, or paid state/i)).toBeInTheDocument();
  });
});
