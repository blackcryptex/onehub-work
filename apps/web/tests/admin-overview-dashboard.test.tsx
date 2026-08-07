import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCurrentUser, canAccessDashboard, redirect, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  canAccessDashboard: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  prisma: {
    metricDaily: { findMany: vi.fn() },
    organization: { count: vi.fn() },
    user: { count: vi.fn() },
    event: { count: vi.fn() },
    dispute: { count: vi.fn() },
    refundRequest: { count: vi.fn() },
    paymentHoldback: { count: vi.fn() },
    payout: { count: vi.fn() },
    adminOverride: { count: vi.fn() },
    bookingRequest: { count: vi.fn() },
    listing: { count: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ canAccessDashboard }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@onehub/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement("div", { className }, children),
    KPIStat: ({ label, value }: { label: string; value: number | string }) =>
      React.createElement("div", {}, [React.createElement("span", { key: "label" }, label), React.createElement("strong", { key: "value" }, String(value))]),
    TrendSparkline: ({ data }: { data: number[] }) => React.createElement("div", {}, `trend:${data.length}`),
  };
});

import AdminOverviewPage from "../src/app/(app)/admin/overview/page";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "admin-1", email: "marlon.smith35@gmail.com", role: "ADMIN" });
  canAccessDashboard.mockReturnValue(true);
  prisma.metricDaily.findMany.mockResolvedValue([
    { date: new Date("2027-01-02"), gmvInCents: 300000 },
    { date: new Date("2027-01-01"), gmvInCents: 100000 },
  ]);
  prisma.organization.count.mockResolvedValue(12);
  prisma.user.count.mockResolvedValue(44);
  prisma.event.count.mockResolvedValue(9);
  prisma.dispute.count.mockResolvedValue(2);
  prisma.refundRequest.count.mockResolvedValue(3);
  prisma.paymentHoldback.count.mockResolvedValue(4);
  prisma.payout.count.mockResolvedValue(5);
  prisma.adminOverride.count.mockResolvedValue(6);
  prisma.bookingRequest.count.mockResolvedValue(7);
  prisma.listing.count.mockResolvedValue(8);
});

describe("Admin overview dashboard MVP", () => {
  it("renders a complete founder control surface instead of a thin KPI placeholder", async () => {
    render(await AdminOverviewPage());

    expect(screen.getByRole("heading", { name: "Admin command center" })).toBeInTheDocument();
    expect(screen.getByText("Private pilot control room")).toBeInTheDocument();
    expect(screen.getByText("Trust & payment review queue")).toBeInTheDocument();
    expect(screen.getByText("Marketplace and event operations")).toBeInTheDocument();
    expect(screen.getByText("Founder action lanes")).toBeInTheDocument();

    expect(screen.getByText("Open disputes")).toBeInTheDocument();
    expect(screen.getByText("Refund requests")).toBeInTheDocument();
    expect(screen.getByText("Frozen/held payments")).toBeInTheDocument();
    expect(screen.getByText("Pending payouts")).toBeInTheDocument();
    expect(screen.getByText("Admin overrides")).toBeInTheDocument();
    expect(screen.getByText("Booking requests")).toBeInTheDocument();
    expect(screen.getByText("Marketplace listings")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open verification center" })).toHaveAttribute("href", "/admin/verification");
    expect(screen.getByRole("link", { name: "Manage users and role safety" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Review abuse queue" })).toHaveAttribute("href", "/admin/abuse");

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TODO/i)).not.toBeInTheDocument();
  });

  it("keeps admin route guarded", async () => {
    canAccessDashboard.mockReturnValue(false);
    await expect(AdminOverviewPage()).rejects.toThrow("redirect:/app");
  });
});
