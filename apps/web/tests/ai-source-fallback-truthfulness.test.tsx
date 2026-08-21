import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));
vi.mock("@/components/invites/InviteVendorModal", () => ({
  InviteVendorModal: ({ vendorName }: { vendorName: string }) => <div>Invite modal for {vendorName}</div>,
}));
vi.mock("@/components/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
  };
});

import { AiSourceVendorsVenuesPanel } from "../src/components/vault/AiSourceVendorsVenuesPanel";

beforeEach(() => {
  vi.restoreAllMocks();
  routerRefresh.mockReset();
  vi.spyOn(window, "alert").mockImplementation(() => undefined);
});

describe("AI sourcing fallback truthfulness", () => {
  it("uses copy-only unverified fallback leads when the sourcing API fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("sourcing offline"));

    render(<AiSourceVendorsVenuesPanel eventId="event-1" eventName="Smith Wedding" eventLocation="Atlanta, GA" />);
    fireEvent.click(screen.getByRole("button", { name: /AI Source Vendors & Venues/i }));

    expect(await screen.findByText(/Using copy-only fallback leads/i)).toBeInTheDocument();
    expect(screen.getByText("Verified results: 0")).toBeInTheDocument();
    expect(screen.getAllByText("Unverified").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sample Verified Vendor")).not.toBeInTheDocument();
    expect(screen.queryByText("Add to Shortlist")).not.toBeInTheDocument();
    expect(screen.getAllByText("Copy").length).toBeGreaterThan(0);
  });

  it("keeps API-returned verified listings shortlistable only when they carry real listing ids", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            kind: "VERIFIED",
            listingId: "listing-real-1",
            title: "Avery Florals",
            listingType: "VENDOR",
            category: "DECOR_FLORAL",
            city: "Atlanta",
            state: "GA",
            website: "https://avery.example",
            orgName: "Avery Florals LLC",
            badgeText: "Verified",
          },
        ],
      }),
    } as Response);

    render(<AiSourceVendorsVenuesPanel eventId="event-1" eventName="Smith Wedding" eventLocation="Atlanta, GA" />);
    fireEvent.click(screen.getByRole("button", { name: /AI Source Vendors & Venues/i }));

    expect(await screen.findByText("Avery Florals")).toBeInTheDocument();
    expect(screen.getByText("Verified results: 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to Shortlist" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenLastCalledWith("/api/shortlist/add", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ eventId: "event-1", listingId: "listing-real-1" }),
      }));
    });
  });
});
