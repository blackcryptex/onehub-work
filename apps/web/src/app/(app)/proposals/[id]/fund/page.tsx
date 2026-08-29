import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewCommercialProposal } from "@/lib/rbac";
import { contractDetail } from "@/lib/routes";

export default async function FundProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  if (!user) return notFound();

  const proposal = await prisma.proposal.findUnique({
    where: { id: resolvedParams.id },
    include: {
      contract: { select: { id: true } },
      event: {
        include: {
          org: { include: { members: true } },
          stakeholders: { select: { userId: true, role: true } },
          shares: { select: { viewerUserId: true, scope: true } },
        },
      },
      listing: {
        include: {
          org: { include: { members: true } },
        },
      },
    },
  });

  if (!proposal || !canViewCommercialProposal(user, proposal)) return notFound();

  if (proposal.contract?.id) {
    redirect(contractDetail(proposal.contract.id) as Route);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payment locked</h1>
      <Card className="p-4">
        <div className="space-y-3 text-sm text-slate-600">
          <p className="font-medium text-slate-900">Use the signed contract page for guarded payment readiness.</p>
          <p>
            This legacy funding route no longer shows amounts or a placeholder Stripe form. Payment can only start from the canonical contract detail after a provider-backed proposal is accepted, a contract is generated, and both buyer and seller signatures are complete.
          </p>
          <p>
            Held-funds, release, refund, dispute, holdback, and provider payout states remain guarded review states until the server records the exact Stripe or admin-review evidence.
          </p>
          <Link href={`/proposals/${proposal.id}`} className="inline-flex text-indigo-600 hover:underline">
            Back to proposal details →
          </Link>
        </div>
      </Card>
    </div>
  );
}
