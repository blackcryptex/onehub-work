import { Card, Money } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function FundProposalPage({ params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { milestones: true, escrowAccount: true },
  });
  if (!proposal) return notFound();
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

