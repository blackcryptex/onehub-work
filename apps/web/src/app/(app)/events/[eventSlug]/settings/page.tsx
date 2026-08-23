import { Card } from "@/components/ui";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { EventSubpageHeader } from "../_components/EventSubpageHeader";

export default async function EventSettings({ params }: { params: Promise<{ eventSlug: string }> }) {
  const resolvedParams = await params;
  const { event } = await requireAuthorizedEventBySlug(resolvedParams.eventSlug, "edit");

  return (
    <div className="space-y-4">
      <EventSubpageHeader
        eventName={event.name}
        eventSlug={resolvedParams.eventSlug}
        sectionTitle="Event settings"
        description="Review the event profile fields that drive planner and client-facing summaries."
      />
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-slate-900">Current settings workflow</h2>
        <p className="mt-2 text-sm text-slate-600">
          Confirm core details in the Event Vault before sharing updates with clients or vendors. This MVP keeps settings review tied to the authorized event record instead of exposing incomplete edit controls.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="font-medium text-slate-900">Event</dt>
            <dd className="mt-1 text-slate-600">{event.name}</dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <dt className="font-medium text-slate-900">Vault route</dt>
            <dd className="mt-1 text-slate-600">/diy-planner/vault/{resolvedParams.eventSlug}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
