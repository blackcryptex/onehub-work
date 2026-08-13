import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("react-markdown", () => ({ default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock("@/components/ui", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));
vi.mock("@/components/contracts/ContractEditor", () => ({ ContractEditor: () => <div>contract editor</div> }));
vi.mock("@/components/contracts/ContractSignatureForm", () => ({ ContractSignatureForm: () => <form aria-label="contract signature form">Sign Contract</form> }));
vi.mock("@/components/payments/ContractPaymentPanel", () => ({ ContractPaymentPanel: () => <div>payment panel</div> }));
vi.mock("@/components/legal/LegalNotice", () => ({ LegalNotice: () => <div>legal notice</div> }));

import { ContractPageClient } from "../src/components/contracts/ContractPageClient";

const baseContract = {
  id: "contract-1",
  title: "Vendor Contract",
  bodyMd: "Contract body",
  status: "DRAFT",
  signatures: [],
  proposal: {
    event: { name: "Pilot Event" },
    listing: { title: "Vendor Listing", type: "VENDOR" },
    currency: "USD",
  },
};

describe("ContractPageClient signing readiness", () => {
  it("does not render the signature form while the contract is still draft", () => {
    render(
      <ContractPageClient
        contract={baseContract}
        eventVaultHref={null}
        canEdit={true}
        canEnterPayment={true}
      />,
    );

    expect(screen.queryByLabelText("contract signature form")).not.toBeInTheDocument();
    expect(screen.getByText("Status: DRAFT")).toBeInTheDocument();
  });

  it("renders the signature form only after the contract is out for signature", () => {
    render(
      <ContractPageClient
        contract={{ ...baseContract, status: "OUT_FOR_SIGNATURE" }}
        eventVaultHref={null}
        canEdit={false}
        canEnterPayment={true}
      />,
    );

    expect(screen.getByLabelText("contract signature form")).toBeInTheDocument();
  });
});
