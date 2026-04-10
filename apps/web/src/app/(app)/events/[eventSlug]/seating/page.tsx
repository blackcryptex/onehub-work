import { SeatingCanvas, Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

export default async function SeatingPage({ params }: { params: { eventSlug: string } }) {
  const { event } = await requireAuthorizedEventBySlug(params.eventSlug, "manage");

  const plan = await prisma.seatingPlan.findUnique({
    where: { eventId: event.id },
    include: { tables: { include: { seats: { include: { guest: true } } } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Seating Plan</h1>
      <Card className="p-4">
        {plan ? (
          <SeatingCanvas
            tables={plan.tables.map((t) => ({
              id: t.id,
              name: t.name,
              capacity: t.capacity,
              x: t.x,
              y: t.y,
              seats: t.seats.map((s) => ({
                id: s.id,
                number: s.number,
                guestName: s.guest ? `${s.guest.firstName} ${s.guest.lastName}` : undefined,
              })),
            }))}
          />
        ) : (
          <div className="text-sm text-slate-600">No seating plan created yet.</div>
        )}
      </Card>
    </div>
  );
}
