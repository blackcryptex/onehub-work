import type { Route } from "next";
import Link from "next/link";
import { KPIStat, TrendSparkline, Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    redirect("/app");
  }

  const [
    metrics,
    orgs,
    users,
    events,
    openDisputes,
    refundRequests,
    frozenPayments,
    pendingPayouts,
    adminOverrides,
    bookingRequests,
    marketplaceListings,
  ] = await Promise.all([
    prisma.metricDaily.findMany({ orderBy: { date: "desc" }, take: 30 }),
    prisma.organization.count(),
    prisma.user.count(),
    prisma.event.count(),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.refundRequest.count(),
    prisma.paymentHoldback.count(),
    prisma.payout.count(),
    prisma.adminOverride.count(),
    prisma.bookingRequest.count(),
    prisma.listing.count(),
  ]);

  const trendData = [...metrics].reverse().map((metric) => metric.gmvInCents / 100);
  const latest = metrics[0];
  const latestGmv = latest ? formatMoney(latest.gmvInCents) : "$0";

  const reviewQueue = [
    { label: "Open disputes", value: openDisputes, href: "/admin/verification?disputeStatus=OPEN" },
    { label: "Refund requests", value: refundRequests, href: "/admin/verification" },
    { label: "Frozen/held payments", value: frozenPayments, href: "/admin/verification" },
    { label: "Pending payouts", value: pendingPayouts, href: "/admin/verification" },
    { label: "Admin overrides", value: adminOverrides, href: "/admin/verification" },
  ];

  const opsQueue = [
    { label: "Organizations", value: orgs },
    { label: "Users", value: users },
    { label: "Events", value: events },
    { label: "Booking requests", value: bookingRequests },
    { label: "Marketplace listings", value: marketplaceListings },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Private pilot control room</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Admin command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Monitor trust, payment review, marketplace readiness, role safety, and event operations without changing public launch, payout, or production settings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin/verification" className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800">
              Open verification center
            </Link>
            <Link href="/admin/users" className="rounded-lg border px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Manage users and role safety
            </Link>
            <Link href="/admin/abuse" className="rounded-lg border px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Review abuse queue
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KPIStat label="Organizations" value={orgs} />
        <KPIStat label="Users" value={users} />
        <KPIStat label="Events" value={events} />
        <KPIStat label="Open Disputes" value={openDisputes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Trust & payment review queue</h2>
              <p className="mt-1 text-sm text-slate-600">Founder/admin lanes that protect escrow, refunds, disputes, holdbacks, payouts, and overrides.</p>
            </div>
            <Link href="/admin/verification" className="text-sm font-medium text-indigo-600 hover:underline">
              Review all →
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {reviewQueue.map((item) => (
              <Link key={item.label} href={item.href as Route} className="rounded-xl border p-4 hover:bg-slate-50">
                <div className="text-sm text-slate-600">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Marketplace and event operations</h2>
          <p className="mt-1 text-sm text-slate-600">High-level operating counts across users, orgs, events, provider listings, and booking requests.</p>
          <dl className="mt-5 space-y-3">
            {opsQueue.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-sm text-slate-600">{item.label}</dt>
                <dd className="font-semibold text-slate-950">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Founder action lanes</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Link href="/admin/users" className="block rounded-lg border p-3 hover:bg-slate-50">
              <span className="font-medium text-slate-950">User and role safety</span>
              <span className="mt-1 block text-slate-600">Search users, inspect roles, and use founder-gated admin role controls.</span>
            </Link>
            <Link href="/admin/verification/detail" className="block rounded-lg border p-3 hover:bg-slate-50">
              <span className="font-medium text-slate-950">Unified verification detail</span>
              <span className="mt-1 block text-slate-600">Inspect a specific proposal, payment intent, refund, dispute, holdback, payout, or override.</span>
            </Link>
            <Link href="/admin/abuse" className="block rounded-lg border p-3 hover:bg-slate-50">
              <span className="font-medium text-slate-950">Abuse and trust queue</span>
              <span className="mt-1 block text-slate-600">Review safety reports and protect private-pilot trust.</span>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">GMV trend</h2>
              <p className="mt-1 text-sm text-slate-600">Latest recorded GMV: {latestGmv}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">manual review only</span>
          </div>
          {trendData.length > 0 ? (
            <div className="mt-4">
              <TrendSparkline data={trendData} />
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No metric history has been recorded yet.</p>
          )}
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-950">Private pilot boundary</h2>
        <p className="mt-2 text-sm text-amber-900">
          This dashboard surfaces operational status and review links only. It does not expose public controls, activate payments, change environments, alter credentials, or launch production access.
        </p>
      </Card>
    </div>
  );
}
