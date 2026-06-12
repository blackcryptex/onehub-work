import { CalendarView } from "@onehub/ui";
import { db } from "@/server/db";
import { auth } from "@/lib/auth";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return <div>Unauthorized</div>;
  const orgs = await db.organization.findMany({ where: { members: { some: { userId } } } });
  const events = await db.calendarEvent.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    orderBy: { startAt: "asc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <CalendarView
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          allDay: e.allDay,
          location: e.location ?? undefined,
        }))}
      />
    </div>
  );
}
