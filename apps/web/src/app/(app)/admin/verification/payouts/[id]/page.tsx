import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }

export default async function PayoutVerificationDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const payout = await db.payout.findUnique({ where: { id: params.id } });
  if (!payout) notFound();

  const proposal = await db.proposal.findUnique({ where: { id: payout.proposalId }, include: { event: true, contract: true } });
  const paymentIntent = proposal?.contract?.id ? await (db as UnsafeAny).paymentIntent.findFirst({ where: { contractId: proposal.contract.id, ...(payout.milestoneId ? { milestoneId: payout.milestoneId } : {}) }, orderBy: { createdAt: 'desc' } }) : null;
  const holdback = paymentIntent?.id ? await (db as UnsafeAny).paymentHoldback.findUnique({ where: { paymentIntentId: paymentIntent.id } }) : null;
  const refunds = await (db as UnsafeAny).refundRequest.findMany({ where: { proposalId: payout.proposalId }, orderBy: { createdAt: 'desc' }, take: 10 });
  const disputes = await (db as UnsafeAny).dispute.findMany({ where: { proposalId: payout.proposalId }, orderBy: { createdAt: 'desc' }, take: 10 });
  const overrides = await (db as UnsafeAny).adminOverride.findMany({ where: { payoutId: payout.id }, orderBy: { createdAt: 'desc' } });
  const acceptanceProof = paymentIntent?.id ? await (db as UnsafeAny).acceptanceCapture.findFirst({ where: { OR: [{ paymentIntentId: paymentIntent.id }, proposal?.contract?.id ? { contractId: proposal.contract.id } : undefined, { proposalId: payout.proposalId }].filter(Boolean) }, orderBy: { acceptedAt: 'desc' } }) : await (db as UnsafeAny).acceptanceCapture.findFirst({ where: { proposalId: payout.proposalId }, orderBy: { acceptedAt: 'desc' } });

  return (
    <div className="space-y-6">
      <div><Link href="/admin/verification" className="text-sm text-indigo-600 hover:underline">← Back to verification</Link><h1 className="mt-2 text-2xl font-bold">Payout {payout.id}</h1></div>
      <div className="grid gap-3 md:grid-cols-2">{[["Status", payout.status],["Proposal", payout.proposalId],["Milestone", payout.milestoneId || 'none'],["Stripe transfer", payout.stripeTransfer || 'pending'],["Booking classification", proposal?.bookingClassification || 'unknown'],["Release blockers", [refunds[0]?.status === 'OPEN' ? 'refund' : null, disputes[0] && ['OPEN','NEEDS_INFO','UNDER_ADMIN_REVIEW','ESCALATED'].includes(disputes[0].status) ? 'dispute' : null, holdback?.state === 'ACTIVE' ? 'holdback' : null].filter(Boolean).join(', ') || 'none']].map(([k,v]) => <div key={String(k)} className="rounded-xl border bg-white p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 break-all font-medium">{String(v)}</div></div>)}</div>
      <JsonCard title="Proposal / booking classification" data={proposal} />
      <JsonCard title="Fee profile snapshot" data={refunds[0]?.feeProfileSnapshot || disputes[0]?.feeProfileSnapshot || holdback?.feeProfileSnapshot || null} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Refund status" data={refunds} />
      <JsonCard title="Dispute status" data={disputes} />
      <JsonCard title="Holdback state" data={holdback} />
      <JsonCard title="Payout / release state" data={{ payout, paymentIntent }} />
      <JsonCard title="Override history" data={overrides} />
      <JsonCard title="Legal version references" data={{ acceptanceLegalVersion: acceptanceProof?.legalVersion || null, sourceSurface: acceptanceProof?.sourceSurface || null }} />
    </div>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) { return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>; }
