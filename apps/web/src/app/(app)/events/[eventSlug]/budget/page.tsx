import { BudgetTable, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { EventSubpageHeader } from "../_components/EventSubpageHeader";

type BudgetLineData = {
  id: string;
  category: string;
  label: string;
  plannedCents: number;
  actualCents: number;
};

export default async function EventBudget({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "view");

  const ev = await prisma.event.findUnique({
    where: { id: authorizedEvent.id },
    include: { budgetLines: true },
  });

  if (!ev) return null;

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
        description="Track planned and actual spend for this event without leaving the Event Vault context."
      />
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
