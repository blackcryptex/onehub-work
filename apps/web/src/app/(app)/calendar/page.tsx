import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarView } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function roleLabel(role: string | null | undefined) {
  if (role === "PRO_PLANNER") return "Pro planner";
  if (role === "DIY_PLANNER") return "DIY planner";
  if (role === "VENDOR") return "Vendor";
  if (role === "VENUE") return "Venue";
  if (role === "ADMIN") return "Admin";
  return "Team";
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: user.id } } },
    select: { id: true, name: true },
  });
  const events = await prisma.calendarEvent.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    include: {
      org: { select: { name: true } },
      event: { select: { name: true, slug: true } },
    },
    orderBy: { startAt: "asc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{roleLabel(user.role)} calendar overview</p>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upcoming bookings, availability holds, planning milestones, and organization calendar items you can access.
        </p>
      </div>

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

      <section className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">Upcoming calendar items</div>
        <div className="divide-y">
          {events.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-600">
              <p className="font-medium text-slate-900">No upcoming calendar items are loaded.</p>
              <p className="mt-1">Event dates, vendor bookings, availability windows, and planning milestones will appear here when they are connected to your organization records.</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.org.name}{event.event ? ` / ${event.event.name}` : ""}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDateTime(event.startAt)}</span>
                </div>
                {event.event?.slug && (
                  <Link href={`/events/${event.event.slug}` as Route} className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
                    Open event workspace →
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
