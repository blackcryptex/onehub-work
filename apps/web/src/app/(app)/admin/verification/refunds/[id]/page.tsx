import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { submitRefundReview } from "../../actions";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function RefundVerificationDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const refund = await (prisma as any).refundRequest.findUnique({ where: { id: resolvedParams.id } });
  if (!refund) notFound();

  const dispute = refund.proposalId ? await (prisma as any).dispute.findFirst({ where: { proposalId: refund.proposalId }, orderBy: { createdAt: "desc" } }) : null;
  const holdback = refund.paymentIntentId ? await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: refund.paymentIntentId } }) : null;
  const payout = refund.milestoneId ? await prisma.payout.findFirst({ where: { milestoneId: refund.milestoneId } }) : await prisma.payout.findFirst({ where: { proposalId: refund.proposalId }, orderBy: { createdAt: "desc" } });
  const overrides = await (prisma as any).adminOverride.findMany({ where: { refundRequestId: refund.id }, orderBy: { createdAt: "desc" } });
  const acceptanceProof = refund.acceptanceCaptureId ? await (prisma as any).acceptanceCapture.findUnique({ where: { id: refund.acceptanceCaptureId } }) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/verification" className="text-sm text-indigo-600 hover:underline">← Back to verification</Link>
        <h1 className="mt-2 text-2xl font-bold">Refund request {refund.id}</h1>
      </div>

      <SummaryGrid items={[
        ["Status", refund.status],
        ["Proposal", refund.proposalId],
        ["Payment intent", refund.paymentIntentId || "none"],
        ["Milestone", refund.milestoneId || "none"],
        ["Booking classification", String(refund.bookingClassification)],
      ]} />

      {refund.status === "OPEN" && (
        <form action={submitRefundReview} className="grid gap-3 rounded-xl border bg-white p-4">
          <input type="hidden" name="refundRequestId" value={refund.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <select name="decision" className="rounded border px-3 py-2" defaultValue="APPROVED">
              <option value="APPROVED">Approve</option>
              <option value="DENIED">Deny</option>
            </select>
            <input name="decisionReason" required minLength={3} placeholder="Decision reason" className="rounded border px-3 py-2" />
            <input name="processingFeeTreatment" defaultValue={String(refund.processingFeeTreatment)} className="rounded border px-3 py-2" />
            <input name="platformFeeTreatment" defaultValue={String(refund.platformFeeTreatment)} className="rounded border px-3 py-2" />
          </div>
          <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white">Submit refund decision</button>
        </form>
      )}

      <JsonCard title="Fee profile snapshot" data={refund.feeProfileSnapshot} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Dispute status" data={dispute} />
      <JsonCard title="Holdback state" data={holdback} />
      <JsonCard title="Payout / release state" data={payout} />
      <JsonCard title="Override history" data={overrides} />
    </div>
  );
}

function SummaryGrid({ items }: { items: [string, string][] }) {
  return <div className="grid gap-3 md:grid-cols-2">{items.map(([k, v]) => <div key={k} className="rounded-xl border bg-white p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 break-all font-medium">{v}</div></div>)}</div>;
}

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>;
}
