import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { EventSubpageHeader } from "../_components/EventSubpageHeader";

export default async function EventChecklists({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "manage");

  const lists = await prisma.checklist.findMany({
    where: { eventId: authorizedEvent.id },
    include: { items: true },
  });

  return (
    <div className="space-y-4">
      <EventSubpageHeader
        eventName={authorizedEvent.name}
        eventSlug={resolvedParams.eventSlug}
        sectionTitle="Checklists"
        description="Keep planning tasks grouped and visible so this event can move forward without losing context."
      />
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
      {lists.length === 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900">Build your planning checklist</h2>
          <p className="mt-2 text-sm text-slate-600">
            No checklists are attached to this event yet. Add planning tasks when you are ready to track owners, due dates, and completion.
          </p>
        </Card>
      )}
    </div>
  );
}
