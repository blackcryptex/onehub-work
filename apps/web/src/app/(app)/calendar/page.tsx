import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

async function createCalendarItem(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const title = String(formData.get("title") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim();
  const eventIdRaw = String(formData.get("eventId") ?? "").trim();
  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const allDay = formData.get("allDay") === "on";

  if (!title || !orgId || !startAtRaw) {
    redirect("/calendar?calendarError=missing-required-fields");
  }

  const org = await prisma.organization.findFirst({
    where: {
      id: orgId,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: { id: true },
  });

  if (!org) redirect("/calendar?calendarError=organization-not-available");

  const eventId = eventIdRaw || undefined;
  if (eventId) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, orgId },
      select: { id: true },
    });
    if (!event) redirect("/calendar?calendarError=event-not-available");
  }

  const startAt = new Date(startAtRaw);
  const explicitEndAt = endAtRaw ? new Date(endAtRaw) : null;
  if (Number.isNaN(startAt.getTime()) || (explicitEndAt && Number.isNaN(explicitEndAt.getTime()))) {
    redirect("/calendar?calendarError=invalid-date");
  }
  const endAt = explicitEndAt && explicitEndAt >= startAt ? explicitEndAt : new Date(startAt.getTime() + 60 * 60 * 1000);

  await prisma.calendarEvent.create({
    data: {
      orgId,
      eventId,
      title,
      description: description || undefined,
      startAt,
      endAt,
      allDay,
      location: location || undefined,
      visibility: "private",
      source: "onehub",
      createdById: user.id,
    },
  });

  revalidatePath("/calendar");
  redirect("/calendar?calendarCreated=1");
}

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: user.id } } },
    select: { id: true, name: true },
  });
  const orgIds = orgs.map((o) => o.id);
  const eventOptions = await prisma.event.findMany({
    where: { orgId: { in: orgIds } },
    select: { id: true, name: true, orgId: true },
    orderBy: { startAt: "asc" },
    take: 100,
  });
  const events = await prisma.calendarEvent.findMany({
    where: { orgId: { in: orgIds } },
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

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Add calendar item</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add a OneHub calendar record for your team. This does not sync with Google Calendar or any live external integration.
          </p>
        </div>
        {orgs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            Join or create an organization before adding calendar items.
          </div>
        ) : (
          <form action={createCalendarItem} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
              Title
              <input name="title" required placeholder="Venue walkthrough" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Organization
              <select name="orgId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal">
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Related event optional
              <select name="eventId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal">
                <option value="">No event link</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Start
              <input name="startAt" required type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              End optional
              <input name="endAt" type="datetime-local" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Location optional
              <input name="location" placeholder="Hotel ballroom" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="flex items-center gap-2 self-end text-sm font-medium text-slate-700">
              <input name="allDay" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              All-day item
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">
              Notes optional
              <textarea name="description" rows={3} placeholder="What should the team remember?" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Add calendar item
              </button>
            </div>
          </form>
        )}
      </section>

      <CalendarView
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          startAt: e.startAt.toISOString(),
          endAt: e.endAt.toISOString(),
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
