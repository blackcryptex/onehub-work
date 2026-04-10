import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }

export default async function OverrideVerificationDetail({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const override = await (prisma as any).adminOverride.findUnique({ where: { id: params.id } });
  if (!override) notFound();

  const refund = override.refundRequestId ? await (prisma as any).refundRequest.findUnique({ where: { id: override.refundRequestId } }) : null;
  const dispute = override.disputeId ? await (prisma as any).dispute.findUnique({ where: { id: override.disputeId } }) : null;
  const holdback = override.paymentHoldbackId ? await (prisma as any).paymentHoldback.findUnique({ where: { id: override.paymentHoldbackId } }) : override.paymentIntentId ? await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: override.paymentIntentId } }) : null;
  const payout = override.payoutId ? await prisma.payout.findUnique({ where: { id: override.payoutId } }) : null;
  const acceptanceProof = override.acceptanceCaptureId ? await (prisma as any).acceptanceCapture.findUnique({ where: { id: override.acceptanceCaptureId } }) : null;
  const proposal = override.proposalId ? await prisma.proposal.findUnique({ where: { id: override.proposalId }, include: { event: true, contract: true } }) : null;

  return (
    <div className="space-y-6">
      <div><Link href="/app/admin/verification" className="text-sm text-indigo-600 hover:underline">← Back to verification</Link><h1 className="mt-2 text-2xl font-bold">Override {override.id}</h1></div>
      <div className="grid gap-3 md:grid-cols-2">{[["Target type", override.targetType],["Exception type", override.exceptionType],["Decision", override.decision],["Authority path", override.authorityPath],["Proposal", override.proposalId || 'none'],["Payment intent", override.paymentIntentId || 'none']].map(([k,v]) => <div key={String(k)} className="rounded-xl border bg-white p-4"><div className="text-xs uppercase text-slate-500">{k}</div><div className="mt-1 break-all font-medium">{String(v)}</div></div>)}</div>
      <JsonCard title="Override record" data={override} />
      <JsonCard title="Booking classification" data={{ proposalClassification: proposal?.bookingClassification || null, overrideClassification: override.bookingClassification }} />
      <JsonCard title="Fee profile snapshot" data={override.feeProfileSnapshot} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Refund status" data={refund} />
      <JsonCard title="Dispute status" data={dispute} />
      <JsonCard title="Holdback state" data={holdback} />
      <JsonCard title="Payout / release state" data={payout} />
      <JsonCard title="Legal version references" data={{ acceptanceLegalVersion: acceptanceProof?.legalVersion || null, sourceSurface: acceptanceProof?.sourceSurface || null, authorityPath: override.authorityPath }} />
    </div>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) { return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>; }
