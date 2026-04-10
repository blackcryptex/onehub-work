import { Card, DisputeBadge } from "@onehub/ui";
import Link from "next/link";
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
  const refundRequests = await (prisma as any).refundRequest.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    include: { proposal: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Disputes</h1>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Refund and dispute submissions are review requests tied to guarded MVP legal policy. See <Link href="/legal/refunds" className="text-indigo-600 hover:underline">refund policy</Link> and <Link href="/legal/disputes" className="text-indigo-600 hover:underline">dispute policy</Link>.
      </div>
      <Card className="p-4 space-y-3">
        <div>
          <div className="font-semibold">Submit refund request</div>
          <div className="text-sm text-slate-600">Refunds are admin-approved only. This creates a review record, it does not self-serve a refund.</div>
        </div>
        <form action="/api/refund-requests" method="post" className="grid gap-3">
          <input name="proposalId" placeholder="Proposal ID" className="rounded border px-3 py-2" />
          <input name="milestoneId" placeholder="Milestone ID (optional)" className="rounded border px-3 py-2" />
          <input name="amountRequestedCents" placeholder="Amount in cents" type="number" className="rounded border px-3 py-2" />
          <textarea name="reason" placeholder="Why are you requesting a refund?" className="rounded border px-3 py-2" rows={4} />
          <button type="submit" className="w-fit rounded bg-slate-900 px-4 py-2 text-white">Submit refund request</button>
        </form>
      </Card>
      <div className="space-y-3">
        {refundRequests.map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">Refund request {r.id}</div>
                <div className="mt-1 text-sm text-slate-600">{r.proposal.title}</div>
                <div className="mt-2 text-sm">{r.reason}</div>
              </div>
              <div className="text-sm font-medium">{r.status}</div>
            </div>
          </Card>
        ))}
        {refundRequests.length === 0 && <div className="text-sm text-slate-600">No refund requests yet.</div>}
      </div>
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
