import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("@onehub/ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => <a href={href} className={className}>{children}</a>,
}));
vi.mock("@/lib/routes", () => ({
  contractDetail: (id: string) => `/contracts/${id}`,
}));

import { VendorPaymentPanel } from "../src/components/payments/VendorPaymentPanel";
import { ProPlannerPaymentPanel } from "../src/components/payments/ProPlannerPaymentPanel";

const contract = {
  id: "contract-1",
  title: "Florals contract",
  status: "IN_PAYMENT",
  proposal: {
    id: "proposal-1",
    currency: "USD",
    milestones: [
      { id: "milestone-1", title: "Deposit", amountCents: 100000, status: "IN_ESCROW", dueDate: null },
    ],
  },
  event: { name: "Smith Wedding", startAt: new Date("2027-01-01") },
};

describe("W5 payment review copy", () => {
  it("tells providers that held funds are pending admin review, not self-serve release", () => {
    render(<VendorPaymentPanel contracts={[contract]} onMarkComplete={async () => undefined} />);

    expect(screen.getByText(/Provider completion evidence can be submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/blocked by refund requests, disputes, active holdbacks, missing provider payout setup, or admin review/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit completion for admin review/i })).toBeInTheDocument();
  });

  it("tells planners release is an admin-reviewed attempt with blocker checks", () => {
    render(<ProPlannerPaymentPanel contractsAsSeller={[]} contractsAsBuyer={[contract]} />);

    expect(screen.getByText(/Held for admin review/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Release is blocked until refund, dispute, holdback, Connect, Stripe, escrow, and guarded-admin checks pass/i).length).toBeGreaterThan(0);
  });
});
