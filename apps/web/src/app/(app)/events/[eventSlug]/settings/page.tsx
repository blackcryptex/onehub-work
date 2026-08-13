import Link from "next/link";
import { Card } from "@/components/ui";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { EventActions } from "@/components/events/EventActions";
import type { Role } from "@onehub/types/src/roles";

function money(cents: number | null | undefined) {
  return `$${((cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value: Date) {
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function EventSettings({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { user, event } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "edit");

  const location = [event.venueCity, event.venueState, event.venueCountry]
    .filter(Boolean)
    .join(", ") || "Location not set";

  const workspaceLinks = [
    { label: "Overview", href: `/events/${event.slug}` },
    { label: "Checklist", href: `/events/${event.slug}/checklists` },
    { label: "Budget", href: `/events/${event.slug}/budget` },
    { label: "Guests", href: `/events/${event.slug}/guests` },
    { label: "Tasks", href: `/events/${event.slug}/tasks` },
    { label: "Milestones", href: `/events/${event.slug}/milestones` },
    { label: "Seating", href: `/events/${event.slug}/seating` },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Event settings</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{event.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review saved event basics, open the right planning workspace, or use the guarded edit/delete controls.
            </p>
          </div>
          <EventActions
            role={user.role as Role | undefined}
            eventSlug={event.slug}
            eventId={event.id}
            eventName={event.name}
            canEdit={true}
            canDelete={true}
            size="sm"
            showLabels={true}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-slate-900">Saved event basics</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-slate-900">{event.status}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Event type</dt>
            <dd className="mt-1 text-slate-900">{event.eventTypeRaw || event.eventTypeCanonical || event.type}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Guest target</dt>
            <dd className="mt-1 text-slate-900">{event.guestTarget ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Date window</dt>
            <dd className="mt-1 text-slate-900">{date(event.startAt)} – {date(event.endAt)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Location</dt>
            <dd className="mt-1 text-slate-900">{location}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Budget</dt>
            <dd className="mt-1 text-slate-900">{event.budgetRaw || money(event.budgetCents)}</dd>
          </div>
        </dl>
        {(event.objective || event.description) && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {event.objective && <p><span className="font-medium text-slate-900">Objective:</span> {event.objective}</p>}
            {event.description && <p className="mt-2"><span className="font-medium text-slate-900">Description:</span> {event.description}</p>}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-slate-900">Planning destinations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Each link opens a real event workspace for this saved event.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workspaceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as never}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
