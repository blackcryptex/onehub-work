import { Card } from "@/components/ui";
import { db } from "@/server/db";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

export default async function EventChecklists(props: { params: Promise<{ eventSlug: string }> }) {
  const params = await props.params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(params.eventSlug, "manage");

  const lists = await db.checklist.findMany({
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
