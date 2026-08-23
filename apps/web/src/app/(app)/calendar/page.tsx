import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CalendarView } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  ensureOneHubCalendar,
  pullMappedGoogleCalendarEvents,
  pushOneHubCalendarEvents,
  syncOneHubCalendarEventToGoogle,
} from "@/lib/google.calendar";

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

function statusMessage(searchParams: Record<string, string | string[] | undefined>) {
  const has = (key: string) => Boolean(searchParams[key]);
  if (has("calendarCreated")) return "Calendar item saved in OneHub.";
  if (has("calendarCreatedAndSynced")) return "Calendar item saved in OneHub and synced to Google.";
  if (has("calendarCreatedGoogleFailed")) return "Calendar item saved in OneHub, but Google rejected the sync. Use Sync to Google after reconnecting or try again.";
  if (has("googleConnected")) return "Google Calendar connected. You can now create or use the OneHub calendar and sync records.";
  if (has("googleCalendarReady")) return "Google OneHub calendar is ready.";
  if (has("googlePushed")) return "OneHub calendar records pushed to Google.";
  if (has("googlePulled")) return "Google changes pulled for mapped OneHub calendar records.";
  return null;
}

function errorMessage(searchParams: Record<string, string | string[] | undefined>) {
  const code = searchParams.calendarError || searchParams.googleError;
  if (!code) return null;
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return "Calendar action failed.";
  const messages: Record<string, string> = {
    "missing-required-fields": "Title, organization, and start time are required.",
    "organization-not-available": "That organization is not available to your account.",
    "event-not-available": "That event is not available for the selected organization.",
    "invalid-date": "Use a valid start and end date/time.",
    "connect-failed": "Google connection failed. Try reconnecting Google Calendar.",
    "calendar-failed": "Google could not create or find the OneHub calendar.",
    "push-failed": "Google rejected the sync request. Reconnect Google Calendar or try again.",
    "pull-failed": "Google changes could not be pulled right now. Reconnect Google Calendar or try again.",
  };
  return messages[value] || "Calendar action failed.";
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

  const created = await prisma.calendarEvent.create({
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

  const googleAccount = await prisma.calendarAccount.findFirst({
    where: { userId: user.id, provider: "google" },
    select: { id: true },
  });

  if (googleAccount) {
    try {
      await syncOneHubCalendarEventToGoogle(user.id, created);
      revalidatePath("/calendar");
      redirect("/calendar?calendarCreatedAndSynced=1");
    } catch {
      revalidatePath("/calendar");
      redirect("/calendar?calendarCreatedGoogleFailed=1");
    }
  }

  revalidatePath("/calendar");
  redirect("/calendar?calendarCreated=1");
}

async function createOrUseGoogleCalendar() {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  try {
    await ensureOneHubCalendar(user.id);
    revalidatePath("/calendar");
    redirect("/calendar?googleCalendarReady=1");
  } catch {
    redirect("/calendar?googleError=calendar-failed");
  }
}

async function pushToGoogle() {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: { id: true },
  });
  const orgIds = orgs.map((org) => org.id);
  const events = await prisma.calendarEvent.findMany({
    where: { orgId: { in: orgIds } },
    orderBy: { startAt: "asc" },
    take: 250,
  });

  const result = await pushOneHubCalendarEvents(user.id, events);
  revalidatePath("/calendar");
  redirect(result.failed === 0 ? "/calendar?googlePushed=1" : "/calendar?googleError=push-failed");
}

async function pullFromGoogle() {
  "use server";

  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const result = await pullMappedGoogleCalendarEvents(user.id);
  revalidatePath("/calendar");
  redirect(result.failed === 0 ? "/calendar?googlePulled=1" : "/calendar?googleError=pull-failed");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const params = searchParams ? await searchParams : {};

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
  const googleAccount = await prisma.calendarAccount.findFirst({
    where: { userId: user.id, provider: "google" },
    select: { email: true, googleCalendarId: true },
  });
  const notice = statusMessage(params);
  const error = errorMessage(params);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{roleLabel(user.role)} calendar overview</p>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upcoming bookings, availability holds, planning milestones, and organization calendar items you can access.
        </p>
      </div>

      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div> : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Google Calendar sync</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect your own Google account. OneHub only syncs calendar records your account can access through your organizations.
          </p>
        </div>
        {googleAccount ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Connected as {googleAccount.email}. {googleAccount.googleCalendarId ? "OneHub Google calendar is selected." : "Create or select the OneHub Google calendar before syncing."}
            </div>
            <div className="flex flex-wrap gap-3">
              <form action={createOrUseGoogleCalendar}>
                <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Create/use OneHub calendar
                </button>
              </form>
              <form action={pushToGoogle}>
                <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Sync OneHub to Google
                </button>
              </form>
              <form action={pullFromGoogle}>
                <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Pull Google changes
                </button>
              </form>
            </div>
            <p className="text-xs text-slate-500">
              Duplicate protection uses OneHub-to-Google mapping records. Pull only updates Google events that OneHub originally synced.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Not connected. Google sync needs Calendar permission and offline access so OneHub can refresh your token safely.
            </p>
            <Link href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent("/api/google/callback")}` as Route} className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Connect Google Calendar
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Add calendar item</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add a OneHub calendar record for your team. If Google Calendar is connected, OneHub will also sync this record to your OneHub Google calendar.
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
