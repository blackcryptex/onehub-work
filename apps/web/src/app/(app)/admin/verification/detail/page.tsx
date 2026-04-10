import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";

function pretty(value: unknown) { return JSON.stringify(value, null, 2); }

export default async function UnifiedVerificationDetail({ searchParams }: { searchParams: { proposalId?: string; paymentIntentId?: string; payoutId?: string; refundRequestId?: string; disputeId?: string } }) {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const seedRefund = searchParams.refundRequestId ? await (prisma as any).refundRequest.findUnique({ where: { id: searchParams.refundRequestId } }) : null;
  const seedDispute = searchParams.disputeId ? await (prisma as any).dispute.findUnique({ where: { id: searchParams.disputeId } }) : null;
  const seedPayout = searchParams.payoutId ? await prisma.payout.findUnique({ where: { id: searchParams.payoutId } }) : null;

  const proposalId = searchParams.proposalId || seedRefund?.proposalId || seedDispute?.proposalId || seedPayout?.proposalId || undefined;
  const payout = seedPayout || (searchParams.payoutId ? null : proposalId ? await prisma.payout.findFirst({ where: { proposalId }, orderBy: { createdAt: 'desc' } }) : null);
  const proposal = proposalId ? await prisma.proposal.findUnique({ where: { id: proposalId }, include: { event: true, contract: true } }) : null;
  const paymentIntentId = searchParams.paymentIntentId || seedRefund?.paymentIntentId || seedDispute?.paymentIntentId || undefined;
  const paymentIntent = paymentIntentId ? await (prisma as any).paymentIntent.findUnique({ where: { id: paymentIntentId } }) : proposal?.contract?.id ? await (prisma as any).paymentIntent.findFirst({ where: { contractId: proposal.contract.id }, orderBy: { createdAt: 'desc' } }) : null;
  const refunds = proposalId ? await (prisma as any).refundRequest.findMany({ where: { proposalId }, orderBy: { createdAt: 'desc' }, take: 10 }) : [];
  const disputes = proposalId ? await (prisma as any).dispute.findMany({ where: { proposalId }, orderBy: { createdAt: 'desc' }, take: 10 }) : [];
  const holdback = paymentIntent?.id ? await (prisma as any).paymentHoldback.findUnique({ where: { paymentIntentId: paymentIntent.id } }) : null;
  const overrides = await (prisma as any).adminOverride.findMany({ where: { OR: [proposalId ? { proposalId } : undefined, paymentIntent?.id ? { paymentIntentId: paymentIntent.id } : undefined, payout?.id ? { payoutId: payout.id } : undefined].filter(Boolean) }, orderBy: { createdAt: 'desc' }, take: 20 });
  const acceptanceProof = await (prisma as any).acceptanceCapture.findFirst({ where: { OR: [paymentIntent?.id ? { paymentIntentId: paymentIntent.id } : undefined, proposal?.contract?.id ? { contractId: proposal.contract.id } : undefined, proposalId ? { proposalId } : undefined].filter(Boolean) }, orderBy: { acceptedAt: 'desc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unified verification detail</h1>
        <p className="text-sm text-slate-600">Search by proposalId, paymentIntentId, payoutId, refundRequestId, or disputeId.</p>
      </div>
      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
        <input name="proposalId" defaultValue={searchParams.proposalId} placeholder="proposalId" className="rounded border px-3 py-2" />
        <input name="paymentIntentId" defaultValue={searchParams.paymentIntentId} placeholder="paymentIntentId" className="rounded border px-3 py-2" />
        <input name="payoutId" defaultValue={searchParams.payoutId} placeholder="payoutId" className="rounded border px-3 py-2" />
        <input name="refundRequestId" defaultValue={searchParams.refundRequestId} placeholder="refundRequestId" className="rounded border px-3 py-2" />
        <input name="disputeId" defaultValue={searchParams.disputeId} placeholder="disputeId" className="rounded border px-3 py-2" />
        <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white">Load context</button>
      </form>
      <JsonCard title="Booking classification" data={{ proposalClassification: proposal?.bookingClassification || null, overrideClassification: overrides[0]?.bookingClassification || null }} />
      <JsonCard title="Fee profile snapshot" data={refunds[0]?.feeProfileSnapshot || disputes[0]?.feeProfileSnapshot || holdback?.feeProfileSnapshot || overrides[0]?.feeProfileSnapshot || null} />
      <JsonCard title="Acceptance proof" data={acceptanceProof} />
      <JsonCard title="Refund status" data={refunds} />
      <JsonCard title="Dispute status" data={disputes} />
      <JsonCard title="Holdback state" data={holdback} />
      <JsonCard title="Payout / release state" data={{ payout, paymentIntent }} />
      <JsonCard title="Override history" data={overrides} />
      <JsonCard title="Legal version references" data={{ acceptanceLegalVersion: acceptanceProof?.legalVersion || null, sourceSurface: acceptanceProof?.sourceSurface || null, authorityPath: overrides[0]?.authorityPath || null }} />
    </div>
  );
}

function JsonCard({ title, data }: { title: string; data: unknown }) { return <section className="rounded-xl border bg-white"><div className="border-b px-4 py-3 font-semibold">{title}</div><pre className="overflow-x-auto p-4 text-xs text-slate-700">{pretty(data)}</pre></section>; }
