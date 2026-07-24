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
        <BudgetTable lines={lines} />
      </Card>
    </div>
  );
}
