import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";

function money(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents || 0) / 100);
}

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    refundStatus?: string;
    disputeStatus?: string;
    holdbackState?: string;
    payoutStatus?: string;
    targetType?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const q = resolvedSearchParams.q?.trim() || "";
  const containsQ = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const refunds = await (prisma as any).refundRequest.findMany({
    where: {
      ...(resolvedSearchParams.refundStatus ? { status: resolvedSearchParams.refundStatus } : {}),
      ...(q
        ? {
            OR: [
              { id: containsQ },
              { proposalId: containsQ },
              { paymentIntentId: containsQ },
              { milestoneId: containsQ },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const disputes = await (prisma as any).dispute.findMany({
    where: {
      ...(resolvedSearchParams.disputeStatus ? { status: resolvedSearchParams.disputeStatus } : {}),
      ...(q
        ? {
            OR: [
              { id: containsQ },
              { proposalId: containsQ },
              { paymentIntentId: containsQ },
              { milestoneId: containsQ },
              { linkedRefundRequestId: containsQ },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const holdbacks = await (prisma as any).paymentHoldback.findMany({
    where: {
      ...(resolvedSearchParams.holdbackState ? { state: resolvedSearchParams.holdbackState } : {}),
      ...(q
        ? {
            OR: [
              { id: containsQ },
              { proposalId: containsQ },
              { paymentIntentId: containsQ },
              { milestoneId: containsQ },
              { contractId: containsQ },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const payouts = await prisma.payout.findMany({
    where: {
      ...(resolvedSearchParams.payoutStatus ? { status: resolvedSearchParams.payoutStatus as any } : {}),
      ...(q
        ? {
            OR: [
              { id: containsQ },
              { proposalId: containsQ },
              { milestoneId: containsQ },
              { stripeTransfer: containsQ },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const overrides = await (prisma as any).adminOverride.findMany({
    where: {
      ...(resolvedSearchParams.targetType ? { targetType: resolvedSearchParams.targetType } : {}),
      ...(q
        ? {
            OR: [
              { id: containsQ },
              { targetId: containsQ },
              { proposalId: containsQ },
              { paymentIntentId: containsQ },
              { refundRequestId: containsQ },
              { disputeId: containsQ },
              { payoutId: containsQ },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin verification</h1>
          <p className="text-sm text-slate-600">Canonical review surfaces for refunds, disputes, holdbacks, payouts, and overrides.</p>
        </div>
        <Link href="/admin/verification/detail" className="text-sm text-indigo-600 hover:underline">Unified detail →</Link>
      </div>

      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-6">
        <input name="q" defaultValue={q} placeholder="Search id, proposal, payment intent, transfer" className="rounded border px-3 py-2 md:col-span-2" />
        <input name="refundStatus" defaultValue={resolvedSearchParams.refundStatus} placeholder="Refund status" className="rounded border px-3 py-2" />
        <input name="disputeStatus" defaultValue={resolvedSearchParams.disputeStatus} placeholder="Dispute status" className="rounded border px-3 py-2" />
        <input name="holdbackState" defaultValue={resolvedSearchParams.holdbackState} placeholder="Holdback state" className="rounded border px-3 py-2" />
        <input name="payoutStatus" defaultValue={resolvedSearchParams.payoutStatus} placeholder="Payout status" className="rounded border px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Filter</button>
      </form>

      <Section title="Refund requests" hrefBase="/admin/verification/refunds" rows={refunds.map((item: any) => ({ id: item.id, bits: [item.status, item.proposalId, money(item.amountRequestedCents, item.currency)] }))} />
      <Section title="Dispute cases" hrefBase="/admin/verification/disputes" rows={disputes.map((item: any) => ({ id: item.id, bits: [item.status, item.freezeState, item.proposalId] }))} />
      <Section title="Holdbacks" hrefBase="/admin/verification/holdbacks" rows={holdbacks.map((item: any) => ({ id: item.paymentIntentId, bits: [item.state, item.proposalId, item.triggerSummary || "no triggers"] }))} />
      <Section title="Payouts" hrefBase="/admin/verification/payouts" rows={payouts.map((item) => ({ id: item.id, bits: [item.status, item.proposalId, money(item.amountCents)] }))} />
      <Section title="Override history" hrefBase="/admin/verification/overrides" rows={overrides.map((item: any) => ({ id: item.id, bits: [item.targetType, item.exceptionType, item.authorityPath] }))} />
    </div>
  );
}

function Section({ title, hrefBase, rows }: { title: string; hrefBase: string; rows: { id: string; bits: string[] }[] }) {
  return (
    <section className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No records found.</div>
        ) : (
          rows.map((row) => (
            <Link key={row.id} href={`${hrefBase}/${row.id}` as Route} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
              <span className="font-mono text-xs text-slate-700">{row.id}</span>
              <span className="text-right text-slate-600">{row.bits.join(" • ")}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
