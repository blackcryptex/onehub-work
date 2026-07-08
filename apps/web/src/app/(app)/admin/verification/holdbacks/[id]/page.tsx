import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { submitHoldbackDecision } from "../../actions";

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }

export default async function HoldbackVerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const holdback = await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: resolvedParams.id } });
  if (!holdback) notFound();

  const refunds = await (prisma as any).refundRequest.findMany({ where: { proposalId: holdback.proposalId }, orderBy: { createdAt: "desc" }, take: 10 });
  const disputes = await (prisma as any).dispute.findMany({ where: { proposalId: holdback.proposalId }, orderBy: { createdAt: "desc" }, take: 10 });
  const payout = holdback.milestoneId ? await prisma.payout.findFirst({ where: { milestoneId: holdback.milestoneId } }) : await prisma.payout.findFirst({ where: { proposalId: holdback.proposalId }, orderBy: { createdAt: "desc" } });
  const overrides = await (prisma as any).adminOverride.findMany({ where: { paymentHoldbackId: holdback.id }, orderBy: { createdAt: "desc" } });
  const acceptanceProof = holdback.acceptanceCaptureId ? await (prisma as any).acceptanceCapture.findUnique({ where: { id: holdback.acceptanceCaptureId } }) : null;

  return (
    <div className="space-y-6">
      <div><Link href="/admin/verification" className="text-sm text-indigo-600 hover:underline">← Back to verification</Link><h1 className="mt-2 text-2xl font-bold">Holdback {holdback.id}</h1></div>
      <div className="grid gap-3 md:grid-cols-2">{[["State", holdback.state],["Payment intent", holdback.paymentIntentId],["Proposal", holdback.proposalId],["Milestone", holdback.milestoneId || "none"],["Booking classification", String(holdback.bookingClassification)],["Trigger summary", holdback.triggerSummary || "none"]].map(([k,v]) => <div key={String(k)} className="rounded-xl border bg-white p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 break-all font-medium">{v}</div></div>)}</div>
      <form action={submitHoldbackDecision} className="grid gap-3 rounded-xl border bg-white p-4">
        <input type="hidden" name="paymentIntentId" value={holdback.paymentIntentId} />
        <div className="grid gap-3 md:grid-cols-4">
          <select name="action" className="rounded border px-3 py-2" defaultValue="RELEASE"><option value="APPLY">APPLY</option><option value="RELEASE">RELEASE</option><option value="CLEAR">CLEAR</option></select>
          <input name="reason" required minLength={5} placeholder="Admin reason" className="rounded border px-3 py-2 md:col-span-2" />
          <input name="holdbackAmountCents" placeholder="Holdback cents" className="rounded border px-3 py-2" />
          <input name="holdbackPercent" placeholder="Holdback %" className="rounded border px-3 py-2" />
        </div>
        <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white">Submit holdback action</button>
      </form>
      <JsonCard title="Fee profile snapshot" data={holdback.feeProfileSnapshot} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Refund status" data={refunds} />
      <JsonCard title="Dispute status" data={disputes} />
      <JsonCard title="Payout / release state" data={payout} />
      <JsonCard title="Override history" data={overrides} />
      <JsonCard title="High-risk triggers" data={holdback.highRiskTriggers} />
    </div>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) { return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>; }
