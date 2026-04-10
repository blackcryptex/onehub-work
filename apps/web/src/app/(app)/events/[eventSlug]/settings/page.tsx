import { Card } from "@/components/ui";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

export default async function EventSettings({ params }: { params: { eventSlug: string } }) {
  await requireAuthorizedEventBySlug(params.eventSlug, "edit");

  return (
    <Card className="p-4">
      <div className="text-sm text-slate-600">Edit event basics (coming soon).</div>
    </Card>
  );
}
