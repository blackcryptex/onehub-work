import { BudgetTable, Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

type BudgetLineData = {
  id: string;
  category: string;
  label: string;
  plannedCents: number;
  actualCents: number;
};

export default async function EventBudget({ params }: { params: { eventSlug: string } }) {
  const user = await getCurrentUser();
  
  // Phase 0: Security hardening - Block CLIENT users from accessing planner event pages
  if (!user) {
    redirect("/signin");
  }
  if (user.role === "CLIENT") {
    redirect("/app");
  }

  const ev = await prisma.event.findFirst({ where: { slug: params.eventSlug }, include: { budgetLines: true } });
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
