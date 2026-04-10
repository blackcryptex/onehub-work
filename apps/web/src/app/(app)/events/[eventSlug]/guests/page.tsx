import { Card } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

export default async function EventGuests({ params }: { params: { eventSlug: string } }) {
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(params.eventSlug, "manage");

  const guestLists = await prisma.guestList.findMany({
    where: { eventId: authorizedEvent.id },
    include: {
      guests: {
        include: {
          group: true,
          invitations: { select: { respondedAt: true, sentAt: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });

  return (
    <div className="space-y-4">
      {guestLists.map((guestList) => (
        <Card key={guestList.id} className="p-4">
          <div className="font-semibold mb-2">{guestList.title}</div>
          <div className="text-sm text-slate-600 mb-4">
            {guestList.invited} invited, {guestList.rsvped} RSVPed
          </div>
          {guestList.guests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Group</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">+1s</th>
                  </tr>
                </thead>
                <tbody>
                  {guestList.guests.map((guest) => (
                    <tr key={guest.id} className="border-b">
                      <td className="p-2">{guest.firstName} {guest.lastName}</td>
                      <td className="p-2">{guest.email || "-"}</td>
                      <td className="p-2">{guest.phone || "-"}</td>
                      <td className="p-2">{guest.group?.name || "-"}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          guest.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                          guest.status === "DECLINED" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {guest.status}
                        </span>
                      </td>
                      <td className="p-2">{guest.plusOnes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-slate-600">No guests yet.</div>
          )}
        </Card>
      ))}
      {guestLists.length === 0 && <div className="text-sm text-slate-600">No guest lists yet.</div>}
    </div>
  );
}
