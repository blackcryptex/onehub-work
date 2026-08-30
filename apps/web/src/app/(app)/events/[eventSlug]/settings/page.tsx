import { Card } from "@/components/ui";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";
import { EventSubpageHeader } from "../_components/EventSubpageHeader";
import { EventDetailsEditForm } from "@/components/events/EventDetailsEditForm";

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
        <h2 className="text-lg font-semibold text-slate-900">Edit event details</h2>
        <p className="mt-2 text-sm text-slate-600">
          Update the core event profile that drives dates, planner summaries, vendor context, client updates, and Event Vault planning records.
        </p>
        <div className="mt-5">
          <EventDetailsEditForm event={{ ...event, slug: resolvedParams.eventSlug }} />
        </div>
      </Card>
    </div>
  );
}
