import { Card, Money } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function PayoutsPage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return <div>Unauthorized</div>;
  const orgs = await prisma.organization.findMany({ where: { members: { some: { userId } } } });
  const payouts = await prisma.payout.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    orderBy: { createdAt: "desc" },
  });
  
  // Fetch proposals separately since Payout model doesn't have a relation defined
  const proposalIds = payouts.map((p) => p.proposalId).filter(Boolean) as string[];
  const proposals = proposalIds.length > 0 
    ? await prisma.proposal.findMany({ where: { id: { in: proposalIds } } })
    : [];
  const proposalMap = new Map(proposals.map((p) => [p.id, p]));
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payouts</h1>
      <div className="space-y-3">
        {payouts.map((p) => {
          const proposal = proposalMap.get(p.proposalId);
          return (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{proposal?.title || `Payout #${p.id.slice(0, 8)}`}</div>
                  <div className="mt-1 text-sm text-slate-600">Status: {p.status}</div>
                </div>
                <Money cents={p.amountCents} />
              </div>
            </Card>
          );
        })}
        {payouts.length === 0 && <div className="text-sm text-slate-600">No payouts yet.</div>}
      </div>
    </div>
  );
}

