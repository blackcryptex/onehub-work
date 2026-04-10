import { Card, ActivityList, Timeline, Countdown } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

type ActivityItem = {
  id: string;
  at: Date;
  action: string;
  target?: string | null;
};

export default async function EventOverview({ params }: { params: { eventSlug: string } }) {
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(params.eventSlug, "view");

  const ev = await prisma.event.findUnique({
    where: { id: authorizedEvent.id },
    include: { budgetLines: true, milestones: true },
  });

  if (!ev) return null;

  const activities = await prisma.activity.findMany({
    where: { eventId: ev.id },
    orderBy: { at: "desc" },
    take: 10,
  });

  const planned = ev.budgetLines.reduce((a, l) => a + l.plannedCents, 0);
  const actual = ev.budgetLines.reduce((a, l) => a + l.actualCents, 0);
  const activityItems: ActivityItem[] = activities.map((activity) => ({
    id: activity.id,
    at: activity.at,
    action: activity.action,
    target: activity.target ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-sm text-slate-600">Status</div><div className="text-xl font-semibold">{ev.status}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-600">Dates</div><div className="text-xl font-semibold">{new Date(ev.startAt).toLocaleDateString()} – {new Date(ev.endAt).toLocaleDateString()}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-600">Budget used</div><div className="text-xl font-semibold">${(actual / 100).toFixed(2)} / ${(planned / 100).toFixed(2)}</div></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">Countdown</h3>
          <Countdown targetDate={ev.startAt} />
        </Card>
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">Timeline</h3>
          <Timeline items={ev.milestones.map((m) => ({ id: m.id, title: m.title, date: m.dueAt, completed: m.done }))} />
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="text-base font-semibold">Recent Activity</h3>
        <div className="mt-2">
          <ActivityList items={activityItems} />
        </div>
      </Card>
    </div>
  );
}
