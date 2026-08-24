import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { redirect, signOut } = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next-auth/react", () => ({ signOut }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("lucide-react", () => ({
  Copy: () => <span aria-hidden="true" />,
  Loader2: () => <span aria-hidden="true" />,
  Mail: () => <span aria-hidden="true" />,
  X: () => <span aria-hidden="true" />,
}));

import RequestsRedirectPage from "../src/app/app/requests/page";
import { InviteVendorModal } from "../src/components/invites/InviteVendorModal";
import { LandingHeader } from "../src/components/layout/LandingHeader";

describe("private-pilot readiness hardening", () => {
  it("redirects legacy /app/requests links to canonical /requests", () => {
    expect(() => RequestsRedirectPage()).toThrow("redirect:/requests");
    expect(redirect).toHaveBeenCalledWith("/requests");
  });

  it("renders authenticated marketplace nav without public auth CTAs", () => {
    render(<LandingHeader currentUser={{ role: "PRO_PLANNER" }} />);

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/pro/planner");
    expect(screen.getByText("Messages").closest("a")).toHaveAttribute("href", "/messages");
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
    expect(screen.queryByText("Create account")).not.toBeInTheDocument();
  });

  it("keeps the invite modal open long enough to show no-email success copy", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: true } as Response);

    function ProductionLikeInviteFlow() {
      const [open, setOpen] = React.useState(true);

      if (!open) {
        return <p>Modal closed</p>;
      }

      return (
        <InviteVendorModal
          vendorName="Vendor Co."
          vendorCategory="Florist"
          eventName="Demo Wedding"
          suggestedEmail="vendor@example.com"
          onClose={() => setOpen(false)}
          onSuccess={() => setOpen(false)}
        />
      );
    }

    render(<ProductionLikeInviteFlow />);

    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => {
      expect(screen.getByText("Invite Copy Prepared")).toBeInTheDocument();
    });
    expect(screen.getByText(/No email was sent by OneHub/i)).toBeInTheDocument();
    expect(screen.queryByText("Modal closed")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByText("Modal closed")).toBeInTheDocument();

    fetchMock.mockRestore();
  });
});
