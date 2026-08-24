import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@onehub/ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/legal/LegalNotice", () => ({
  LegalNotice: () => <div>Legal notice</div>,
}));
vi.mock("../src/components/payments/PaymentModal", () => ({
  PaymentModal: () => <div>Payment modal</div>,
}));

import { ContractPaymentPanel } from "../src/components/payments/ContractPaymentPanel";

const contract = {
  id: "contract-1",
  proposalId: "proposal-1",
  orgId: "buyer-org-1",
  eventId: "event-1",
  title: "Florals contract",
  status: "FULLY_SIGNED" as const,
  buyerId: "buyer-org-1",
  sellerId: "seller-org-1",
  platformFeePercent: 5,
  proposal: {
    currency: "USD",
    event: { name: "Smith Wedding Weekend" },
    listing: {
      title: "Avery Florals",
      org: { name: "Avery Floral Studio" },
    },
  },
  milestones: [
    {
      id: "milestone-1",
      proposalId: "proposal-1",
      title: "Deposit",
      dueType: "DATE_ABSOLUTE" as const,
      dueDate: null,
      amountCents: 100000,
      status: "PENDING" as const,
    },
    {
      id: "milestone-2",
      proposalId: "proposal-1",
      title: "Final balance",
      dueType: "DATE_ABSOLUTE" as const,
      dueDate: null,
      amountCents: 200000,
      status: "IN_ESCROW" as const,
    },
    {
      id: "milestone-3",
      proposalId: "proposal-1",
      title: "Completed add-on",
      dueType: "DATE_ABSOLUTE" as const,
      dueDate: null,
      amountCents: 50000,
      status: "PAID" as const,
    },
  ],
};

describe("payment readiness copy", () => {
  it("explains what is paid, who receives it, held status, and manual trust review before payment actions", () => {
    render(<ContractPaymentPanel contract={contract} canPay />);

    expect(screen.getByText("Guarded payment readiness")).toBeInTheDocument();
    expect(screen.getByText("What this payment covers")).toBeInTheDocument();
    expect(screen.getByText(/signed contract milestones for Smith Wedding Weekend/i)).toBeInTheDocument();
    expect(screen.getByText(/recorded for Avery Floral Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/release remains subject to admin\/manual review, holdbacks, refunds, disputes, and provider payout configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/not marking anything as paid until Stripe confirmation is persisted/i)).toBeInTheDocument();
    expect(screen.getByText("Payable now")).toBeInTheDocument();
    expect(screen.getByText("Held pending review")).toBeInTheDocument();
    expect(screen.getByText("HELD PENDING REVIEW")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Authorize milestone payment \(\$1,000.00\)/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Authorize payable balance \(\$1,000.00\)/i })).toBeDisabled();
  });

  it("hides payment readiness when contract or payment access is not ready", () => {
    const { rerender } = render(<ContractPaymentPanel contract={{ ...contract, status: "PARTIALLY_SIGNED" }} canPay />);
    expect(screen.queryByText("Guarded payment readiness")).not.toBeInTheDocument();

    rerender(<ContractPaymentPanel contract={contract} canPay={false} />);
    expect(screen.queryByText("Guarded payment readiness")).not.toBeInTheDocument();
  });
});
