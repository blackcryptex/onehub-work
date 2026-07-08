import { BudgetTable, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

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
    <Card className="p-4">
      <BudgetTable lines={lines} />
    </Card>
  );
}
