import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const { getCurrentUser, redirect, canAccessDashboard, prisma } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  canAccessDashboard: vi.fn(),
  prisma: {
    metricDaily: { findMany: vi.fn() },
    organization: { count: vi.fn() },
    user: { count: vi.fn() },
    event: { count: vi.fn() },
    dispute: { count: vi.fn(), findFirst: vi.fn() },
    refundRequest: { count: vi.fn(), findFirst: vi.fn() },
    paymentHoldback: { count: vi.fn(), findFirst: vi.fn() },
    payout: { count: vi.fn(), findFirst: vi.fn() },
    abuseReport: { count: vi.fn(), findFirst: vi.fn() },
    paymentIntent: { count: vi.fn() },
    webhookEvent: { count: vi.fn() },
    auditLog: { count: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser }));
vi.mock("@/lib/rbac", () => ({ canAccessDashboard }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@onehub/ui", async () => {
  const React = await import("react");
  return {
    Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => React.createElement("div", { className }, children),
    KPIStat: ({ label, value }: { label: string; value: React.ReactNode }) => React.createElement("div", null, label, ": ", value),
    TrendSparkline: ({ data }: { data: number[] }) => React.createElement("div", { "data-testid": "trend-sparkline" }, `trend points:${data.length}`),
  };
}, { virtual: true });

import AdminOverviewPage from "../src/app/(app)/admin/overview/page";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "admin-1", email: "admin@test.local", role: "ADMIN" });
  canAccessDashboard.mockReturnValue(true);
  prisma.metricDaily.findMany.mockResolvedValue([
    { date: new Date("2027-04-02T00:00:00.000Z"), gmvInCents: 1500000, payoutsCents: 500000 },
    { date: new Date("2027-04-01T00:00:00.000Z"), gmvInCents: 1200000, payoutsCents: 300000 },
  ]);
  prisma.organization.count.mockResolvedValue(12);
  prisma.user.count.mockImplementation(({ where }: { where?: { role?: string } } = {}) => {
    if (where?.role === "ADMIN") return Promise.resolve(2);
    if (where?.role === "EVENT_DREAMER") return Promise.resolve(3);
    return Promise.resolve(48);
  });
  prisma.event.count.mockResolvedValue(18);
  prisma.dispute.count.mockResolvedValue(2);
  prisma.refundRequest.count.mockResolvedValue(1);
  prisma.paymentHoldback.count.mockResolvedValue(1);
  prisma.payout.count.mockResolvedValue(4);
  prisma.abuseReport.count.mockResolvedValue(1);
  prisma.paymentIntent.count.mockResolvedValue(2);
  prisma.webhookEvent.count.mockResolvedValue(1);
  prisma.auditLog.count.mockResolvedValue(42);
  prisma.dispute.findFirst.mockResolvedValue({ id: "dispute-1", title: "Venue cancellation claim", status: "UNDER_ADMIN_REVIEW", freezeState: "ADMIN_REVIEW", proposalId: "proposal-1" });
  prisma.refundRequest.findFirst.mockResolvedValue({ id: "refund-1", status: "OPEN", proposalId: "proposal-2", amountRequestedCents: 25000, currency: "USD" });
  prisma.paymentHoldback.findFirst.mockResolvedValue({ id: "holdback-1", paymentIntentId: "pi_1", state: "ACTIVE", proposalId: "proposal-3", triggerSummary: "manual risk review" });
  prisma.payout.findFirst.mockResolvedValue({ id: "payout-1", status: "PENDING", proposalId: "proposal-4", amountCents: 40000 });
  prisma.abuseReport.findFirst.mockResolvedValue({ id: "abuse-1", reason: "profile impersonation", targetType: "USER", targetId: "user-7", status: "OPEN" });
});

describe("Admin overview trust and risk command workflow", () => {
  it("opens with a data-backed command center for trust, role safety, money oversight, platform safety, and the next safe admin action", async () => {
    const page = await AdminOverviewPage();
    const { container } = render(page);

    expect(screen.getByRole("heading", { name: "Admin trust & risk command center" })).toBeInTheDocument();
    expect(screen.getByText("Review now")).toBeInTheDocument();
    expect(screen.getByText(/Dispute: Venue cancellation claim/i)).toBeInTheDocument();
    expect(screen.getByText(/2 open disputes • 1 refund request • 1 active holdback/i)).toBeInTheDocument();
    expect(screen.getByText("Users, roles & verification")).toBeInTheDocument();
    expect(screen.getByText(/2 admins • 3 event dreamers to verify/i)).toBeInTheDocument();
    expect(screen.getByText("Payments needing oversight")).toBeInTheDocument();
    expect(screen.getByText(/4 pending payouts • 1 refund request • 1 holdback/i)).toBeInTheDocument();
    expect(screen.getByText("Support operations queue")).toBeInTheDocument();
    expect(screen.getByText(/1 open abuse report/i)).toBeInTheDocument();
    expect(screen.getByText(/2 failed payments • 1 unprocessed webhook event • 42 audit trail entries/i)).toBeInTheDocument();
    expect(screen.getByText("Next safe admin action")).toBeInTheDocument();
    expect(screen.getByText(/Open the dispute detail and verify context before any override/i)).toBeInTheDocument();
    expect(screen.getByText(/Oversight only: no live money movement or credential changes from this dashboard/i)).toBeInTheDocument();

    expect(container.querySelector('a[href="/admin/verification/disputes/dispute-1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/users"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/verification?payoutStatus=PENDING"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/abuse"]')).not.toBeNull();
    expect(container).not.toHaveTextContent(/coming soon|placeholder|no-op|content for/i);
  });

  it("shows truthful useful empty states with reachable oversight routes when no admin risk queues are open", async () => {
    prisma.dispute.count.mockResolvedValue(0);
    prisma.refundRequest.count.mockResolvedValue(0);
    prisma.paymentHoldback.count.mockResolvedValue(0);
    prisma.payout.count.mockResolvedValue(0);
    prisma.abuseReport.count.mockResolvedValue(0);
    prisma.paymentIntent.count.mockResolvedValue(0);
    prisma.webhookEvent.count.mockResolvedValue(0);
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.dispute.findFirst.mockResolvedValue(null);
    prisma.refundRequest.findFirst.mockResolvedValue(null);
    prisma.paymentHoldback.findFirst.mockResolvedValue(null);
    prisma.payout.findFirst.mockResolvedValue(null);
    prisma.abuseReport.findFirst.mockResolvedValue(null);

    const page = await AdminOverviewPage();
    const { container } = render(page);

    expect(screen.getByText(/No open trust queue item needs immediate admin review/i)).toBeInTheDocument();
    expect(screen.getByText(/Role roster is visible; keep admin access limited and review event dreamer conversions/i)).toBeInTheDocument();
    expect(screen.getByText(/No pending payouts, refund requests, or active holdbacks/i)).toBeInTheDocument();
    expect(screen.getByText(/No open abuse reports. 0 failed payments • 0 unprocessed webhook events • 0 audit trail entries/i)).toBeInTheDocument();
    expect(screen.getByText(/Scan verification overview and user roles before changing platform settings/i)).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/verification"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/users"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/abuse"]')).not.toBeNull();
    expect(container).not.toHaveTextContent(/coming soon|placeholder|no-op|content for/i);
  });
});
