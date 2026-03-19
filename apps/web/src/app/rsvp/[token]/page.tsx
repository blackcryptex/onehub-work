import { Card } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RSVPForm } from "./rsvp-form";

export default async function RSVPPage({ params }: { params: { token: string } }) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { guest: true, event: true },
  });
  if (!invitation) return notFound();
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">{invitation.event.name}</h1>
        <div className="text-sm text-slate-600 mb-4">
          {new Date(invitation.event.startAt).toLocaleDateString()} at {new Date(invitation.event.startAt).toLocaleTimeString()}
        </div>
        <div className="mb-4">
          <div className="font-medium">Hi {invitation.guest.firstName} {invitation.guest.lastName},</div>
          <div className="text-sm text-slate-600 mt-2">Please let us know if you can attend.</div>
        </div>
        <RSVPForm token={params.token} currentStatus={invitation.guest.status} />
      </Card>
    </div>
  );
}
