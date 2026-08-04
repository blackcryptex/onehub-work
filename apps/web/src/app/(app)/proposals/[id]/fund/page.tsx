import { Card, Money } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewProposalResource } from "@/lib/rbac";

export default async function FundProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id: resolvedParams.id },
    include: {
      milestones: true,
      escrowAccount: true,
      event: {
        select: {
          id: true,
          orgId: true,
          createdById: true,
          org: {
            select: {
              ownerId: true,
              members: { select: { userId: true } },
            },
          },
        },
      },
      listing: {
        select: {
          orgId: true,
          org: {
            select: {
              ownerId: true,
              members: { select: { userId: true } },
            },
          },
        },
      },
    },
  });
  if (!proposal) return notFound();
  const user = await getCurrentUser();
  if (!canViewProposalResource(user, proposal)) return notFound();

  const dueAmount = proposal.milestones
    .filter((m) => m.status === "PENDING")
    .reduce((sum, m) => sum + m.amountCents, 0);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fund Held Funds</h1>
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm text-slate-600">Amount to fund</div>
            <div className="text-2xl font-semibold"><Money cents={dueAmount} currency={proposal.currency} /></div>
          </div>
          <p className="text-sm text-slate-600">Stripe Elements payment form would be embedded here.</p>
        </div>
      </Card>
    </div>
  );
}

