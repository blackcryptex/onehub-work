import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

export default async function EventChecklists({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "manage");

  const lists = await prisma.checklist.findMany({
    where: { eventId: authorizedEvent.id },
    include: { items: true },
  });

  return (
    <div className="space-y-4">
      {lists.map((cl) => (
        <Card key={cl.id} className="p-4">
          <div className="font-semibold">{cl.title}</div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {cl.items.map((it) => (
              <li key={it.id} className={it.done ? "line-through text-slate-500" : ""}>{it.title}</li>
            ))}
          </ul>
        </Card>
      ))}
      {lists.length === 0 && <div className="text-sm text-slate-600">No checklists yet.</div>}
    </div>
  );
}
