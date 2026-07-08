import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { submitDisputeReview } from "../../actions";

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }

export default async function DisputeVerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const dispute = await (prisma as any).dispute.findUnique({ where: { id: resolvedParams.id } });
  if (!dispute) notFound();

  const refund = dispute.linkedRefundRequestId ? await (prisma as any).refundRequest.findUnique({ where: { id: dispute.linkedRefundRequestId } }) : await (prisma as any).refundRequest.findFirst({ where: { proposalId: dispute.proposalId }, orderBy: { createdAt: "desc" } });
  const holdback = dispute.paymentIntentId ? await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: dispute.paymentIntentId } }) : null;
  const payout = dispute.milestoneId ? await prisma.payout.findFirst({ where: { milestoneId: dispute.milestoneId } }) : await prisma.payout.findFirst({ where: { proposalId: dispute.proposalId }, orderBy: { createdAt: "desc" } });
  const overrides = await (prisma as any).adminOverride.findMany({ where: { disputeId: dispute.id }, orderBy: { createdAt: "desc" } });
  const acceptanceProof = dispute.acceptanceCaptureId ? await (prisma as any).acceptanceCapture.findUnique({ where: { id: dispute.acceptanceCaptureId } }) : null;

  return (
    <div className="space-y-6">
      <div><Link href="/admin/verification" className="text-sm text-indigo-600 hover:underline">← Back to verification</Link><h1 className="mt-2 text-2xl font-bold">Dispute case {dispute.id}</h1></div>
      <div className="grid gap-3 md:grid-cols-2">{[["Status", dispute.status],["Freeze state", dispute.freezeState],["Proposal", dispute.proposalId],["Payment intent", dispute.paymentIntentId || "none"],["Milestone", dispute.milestoneId || "none"],["Booking classification", String(dispute.bookingClassification)]].map(([k,v]) => <div key={String(k)} className="rounded-xl border bg-white p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 break-all font-medium">{v}</div></div>)}</div>
      <form action={submitDisputeReview} className="grid gap-3 rounded-xl border bg-white p-4">
        <input type="hidden" name="disputeId" value={dispute.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <select name="action" className="rounded border px-3 py-2" defaultValue="ESCALATE">
            <option value="REQUEST_INFO">REQUEST_INFO</option><option value="ESCALATE">ESCALATE</option><option value="SELLER_FAVOR">SELLER_FAVOR</option><option value="REFUND">REFUND</option><option value="REOPEN">REOPEN</option>
          </select>
          <input name="decisionReason" required minLength={3} placeholder="Decision reason" className="rounded border px-3 py-2" />
        </div>
        <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white">Submit dispute action</button>
      </form>
      <JsonCard title="Fee profile snapshot" data={dispute.feeProfileSnapshot} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Refund status" data={refund} />
      <JsonCard title="Holdback state" data={holdback} />
      <JsonCard title="Payout / release state" data={payout} />
      <JsonCard title="Override history" data={overrides} />
    </div>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) { return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>; }
