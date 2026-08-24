import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

type ActivityItem = {
  id: string;
  at: Date;
  action: string;
  target?: string | null;
};

type MilestoneItem = {
  id: string;
  title: string;
  dueAt: Date;
  done: boolean;
};

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function EventOverview({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "view");

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
  const milestoneItems: MilestoneItem[] = ev.milestones
    .map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      dueAt: milestone.dueAt,
      done: milestone.done,
    }))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const nextMilestone = milestoneItems.find((milestone) => !milestone.done) ?? null;
  const eventDays = daysUntil(ev.startAt);

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
          <div className="text-2xl font-bold">{eventDays > 0 ? eventDays : 0}</div>
          <div className="text-sm text-slate-600">{eventDays > 0 ? "days until event start" : "Event has started"}</div>
          {nextMilestone ? (
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next milestone</div>
              <div className="mt-1 font-medium">{nextMilestone.title}</div>
              <div className="text-xs text-slate-600">{nextMilestone.dueAt.toLocaleDateString()}</div>
            </div>
          ) : null}
        </Card>
        <Card className="p-4">
          <h3 className="text-base font-semibold mb-3">Timeline</h3>
          {milestoneItems.length === 0 ? (
            <p className="text-sm text-slate-600">No milestones are attached to this event yet.</p>
          ) : (
            <ol className="space-y-3">
              {milestoneItems.map((milestone) => (
                <li key={milestone.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{milestone.title}</span>
                    <span className="text-xs text-slate-500">{milestone.dueAt.toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{milestone.done ? "Complete" : "Open"}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="text-base font-semibold">Recent Activity</h3>
        {activityItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No recent activity has been recorded for this event yet.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-2xl border border-slate-200 bg-white">
            {activityItems.map((activity) => (
              <li key={activity.id} className="px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{activity.action}</span>
                  <span className="text-xs text-slate-600">{activity.at.toLocaleString()}</span>
                </div>
                {activity.target ? <div className="text-xs text-slate-600">{activity.target}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
