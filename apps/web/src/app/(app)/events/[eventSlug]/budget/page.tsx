import { BudgetTable, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { canViewBudget } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { EventSubpageHeader } from "../_components/EventSubpageHeader";
import { getEventFinancialSummary } from "@/server/lib/event-financial-summary";

type BudgetLineData = {
  id: string;
  category: string;
  label: string;
  plannedCents: number;
  actualCents: number;
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export default async function EventBudget({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { user, event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "view");

  if (user && !canViewBudget(user, authorizedEvent)) {
    notFound();
  }

  const ev = await prisma.event.findUnique({
    where: { id: authorizedEvent.id },
    include: { budgetLines: true },
  });

  if (!ev) return null;

  const summary = await getEventFinancialSummary({ eventId: ev.id, actor: user });

  const lines: BudgetLineData[] = ev.budgetLines.map((line) => ({
    id: line.id,
    category: line.category ?? "Other",
    label: line.label ?? line.category ?? "Line item",
    plannedCents: Number(line.plannedCents ?? 0),
    actualCents: Number(line.actualCents ?? 0),
  }));

  return (
    <div className="space-y-4">
      <EventSubpageHeader
        eventName={authorizedEvent.name}
        eventSlug={resolvedParams.eventSlug}
        sectionTitle="Budget"
        description="Track planned and actual spend, committed work, paid/held funds, owed amounts, and overrun risk from the canonical event financial summary."
      />
      {summary && (
        <Card className={`border p-4 ${summary.riskLevel === "overrun" ? "border-red-200 bg-red-50" : summary.riskLevel === "watch" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event financial state</p>
              <h2 className="text-lg font-semibold text-slate-950">
                {summary.riskLevel === "overrun"
                  ? `Over budget by ${money(summary.overrunCents, summary.currency)}`
                  : summary.riskLevel === "watch"
                    ? "Budget risk needs review"
                    : "Budget is within current committed exposure"}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Committed includes accepted provider-backed proposals plus approved change orders. Pending change orders are shown as risk exposure only. Held funds are not provider-paid.
              </p>
            </div>
            <div className="text-sm font-semibold text-slate-800">
              Remaining: {money(summary.remainingCents, summary.currency)}
            </div>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Approved budget", summary.budgetTotalCents],
              ["Planned", summary.plannedCents],
              ["Actual", summary.actualCents],
              ["Committed", summary.committedCents],
              ["Payable", summary.payableCents],
              ["Held pending review", summary.heldCents],
              ["Paid/released", summary.paidCents],
              ["Still owed", summary.owedCents],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/70 bg-white/80 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">{money(Number(value), summary.currency)}</dd>
              </div>
            ))}
          </dl>
          {(summary.sourceBreakdown.committedProposals.length > 0 || summary.sourceBreakdown.pendingChangeOrders.length > 0 || summary.sourceBreakdown.approvedChangeOrders.length > 0) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <h3 className="font-semibold text-slate-950">Accepted proposal impact</h3>
                <p className="mt-1 text-slate-600">
                  {summary.sourceBreakdown.committedProposals.length > 0
                    ? summary.sourceBreakdown.committedProposals.map((proposal) => `${proposal.title}: ${money(proposal.totalCents, summary.currency)}`).join(" • ")
                    : "No accepted provider-backed proposals are committed yet."}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <h3 className="font-semibold text-slate-950">Approved change orders</h3>
                <p className="mt-1 text-slate-600">
                  {summary.sourceBreakdown.approvedChangeOrders.length > 0
                    ? summary.sourceBreakdown.approvedChangeOrders.map((order) => `CO #${order.number} ${order.title}: ${money(order.deltaCents, summary.currency)}`).join(" • ")
                    : "No approved change-order deltas are committed."}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <h3 className="font-semibold text-amber-950">Pending change-order risk</h3>
                <p className="mt-1 text-amber-900">
                  {summary.sourceBreakdown.pendingChangeOrders.length > 0
                    ? summary.sourceBreakdown.pendingChangeOrders.map((order) => `CO #${order.number} ${order.title}: ${money(order.deltaCents, summary.currency)}`).join(" • ")
                    : "No pending change-order exposure."}
                </p>
              </div>
            </div>
          )}
          {summary.warnings.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              {summary.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
            </ul>
          )}
        </Card>
      )}
      <Card className="p-4">
        {lines.length > 0 ? (
          <BudgetTable lines={lines} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <h2 className="text-base font-semibold text-slate-900">No budget lines are attached to this event yet.</h2>
            <p className="mt-2">
              Use this page to review planned spend, actual spend, and category totals once budget lines are added.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
