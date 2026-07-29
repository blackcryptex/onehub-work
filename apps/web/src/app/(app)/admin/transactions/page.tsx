import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import { formatCents, isManualAdminOnlyWebhook } from "@/lib/admin-oversight";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage(
  props: {
    searchParams: Promise<{ q?: string; paymentStatus?: string; payoutStatus?: string; webhookType?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) redirect("/app");

  const q = searchParams.q?.trim() || "";
  const containsQ = q ? { contains: q, mode: "insensitive" as const } : undefined;

  const [paymentIntents, transactions, payouts, webhookEvents] = await Promise.all([
    db.paymentIntent.findMany({
      where: {
        ...(searchParams.paymentStatus ? { status: searchParams.paymentStatus as any } : {}),
        ...(q
          ? {
              OR: [
                { id: containsQ },
                { contractId: containsQ },
                { milestoneId: containsQ },
                { stripeIntentId: containsQ },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { payer: { select: { email: true, name: true } }, payee: { select: { email: true, name: true } } },
    }),
    db.moneyTx.findMany({
      where: q
        ? {
            OR: [
              { id: containsQ },
              { stripeId: containsQ },
              { proposalId: containsQ },
              { milestoneId: containsQ },
              { type: containsQ },
            ],
          }
        : {},
      orderBy: { at: "desc" },
      take: 20,
    }),
    db.payout.findMany({
      where: {
        ...(searchParams.payoutStatus ? { status: searchParams.payoutStatus as any } : {}),
        ...(q
          ? {
              OR: [
                { id: containsQ },
                { proposalId: containsQ },
                { milestoneId: containsQ },
                { stripeTransfer: containsQ },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.webhookEvent.findMany({
      where: {
        ...(searchParams.webhookType ? { type: { contains: searchParams.webhookType, mode: "insensitive" as const } } : {}),
        ...(q
          ? {
              OR: [
                { id: containsQ },
                { eventId: containsQ },
                { type: containsQ },
                { stripeIntentId: containsQ },
              ],
            }
          : {}),
      },
      orderBy: { processedAt: "desc" },
      take: 20,
    }),
  ]);

  const manualOnlyWebhooks = webhookEvents.filter((event) => isManualAdminOnlyWebhook(event.meta));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin transactions</h1>
          <p className="text-sm text-slate-600">
            Read-only local/test-mode visibility for payment intents, local transactions, payouts, and manual-admin-only webhook handoffs. No release, refund, payout, transfer, or provider action controls are exposed here.
          </p>
        </div>
        <Link href="/admin/verification" className="text-sm text-indigo-600 hover:underline">Verification queues →</Link>
      </div>

      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
        <input name="q" defaultValue={q} placeholder="Search ids, Stripe/test ids, proposal, milestone" className="rounded border px-3 py-2 md:col-span-2" />
        <input name="paymentStatus" defaultValue={searchParams.paymentStatus} placeholder="Payment status" className="rounded border px-3 py-2" />
        <input name="payoutStatus" defaultValue={searchParams.payoutStatus} placeholder="Payout status" className="rounded border px-3 py-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Filter</button>
      </form>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">Payment-monitoring handoff</div>
        <div>{manualOnlyWebhooks.length} manual-admin-only webhook event(s) in the current result window require operator visibility only. This surface deliberately does not trigger provider calls.</div>
      </section>

      <Section title="Payment intents" rows={paymentIntents.map((item) => ({
        id: item.id,
        bits: [item.status, formatCents(item.amountCents, item.currency), item.stripeIntentId || "no stripe/test id", `payer ${item.payer.email}`, `payee ${item.payee.email}`],
      }))} />
      <Section title="Transactions" rows={transactions.map((item) => ({
        id: item.id,
        bits: [item.type, formatCents(item.amountCents, item.currency), item.proposalId || "no proposal", item.milestoneId || "no milestone", item.stripeId || "no Stripe/test id"],
      }))} />
      <Section title="Payout records" rows={payouts.map((item) => ({
        id: item.id,
        bits: [item.status, formatCents(item.amountCents), item.proposalId, item.stripeTransfer || "no transfer id"],
      }))} />
      <Section title="Webhook handoff events" rows={webhookEvents.map((item) => ({
        id: item.eventId,
        bits: [item.type, isManualAdminOnlyWebhook(item.meta) ? "manual-admin-only" : "automatic/local", item.stripeIntentId || "no intent id", item.processedAt.toLocaleString()],
      }))} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: { id: string; bits: string[] }[] }) {
  return (
    <section className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No records found in the current local/test-mode window.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <span className="break-all font-mono text-xs text-slate-700">{row.id}</span>
              <span className="text-slate-600">{row.bits.join(" • ")}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
