import { Card, DisputeBadge } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function DisputesPage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return <div>Unauthorized</div>;
  const orgs = await prisma.organization.findMany({ where: { members: { some: { userId } } } });
  const disputes = await prisma.dispute.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    include: { proposal: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Disputes</h1>
      <div className="space-y-3">
        {disputes.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{d.title}</div>
                <div className="mt-1 text-sm text-slate-600">{d.proposal.title}</div>
                {d.body && <div className="mt-2 text-sm">{d.body}</div>}
              </div>
              <DisputeBadge status={d.status} />
            </div>
          </Card>
        ))}
        {disputes.length === 0 && <div className="text-sm text-slate-600">No disputes yet.</div>}
      </div>
    </div>
  );
}

