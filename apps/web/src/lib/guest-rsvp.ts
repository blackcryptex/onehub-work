import { prisma } from "@/lib/prisma";

export const PUBLIC_RSVP_STATUSES = ["ACCEPTED", "DECLINED"] as const;

export type PublicRsvpStatus = (typeof PUBLIC_RSVP_STATUSES)[number];

export class GuestRsvpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GuestRsvpError";
  }
}

export async function submitGuestRsvp(input: {
  token: string;
  status: PublicRsvpStatus;
  dietary?: string;
  notes?: string;
}) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: input.token },
    include: { guest: { include: { guestList: true } } },
  });

  if (!invitation) {
    throw new GuestRsvpError("Invitation not found", 404);
  }

  const guest = invitation.guest;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedGuest = await tx.guest.update({
      where: { id: guest.id },
      data: {
        status: input.status,
        dietary: input.dietary || null,
        notes: input.notes || null,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { respondedAt: now },
    });

    const rsvpCount = await tx.guest.count({
      where: {
        guestListId: guest.guestListId,
        status: { in: ["ACCEPTED", "DECLINED"] },
      },
    });

    await tx.guestList.update({
      where: { id: guest.guestListId },
      data: { rsvped: rsvpCount },
    });

    return { updatedGuest, rsvpCount };
  });

  return {
    success: true,
    guestId: guest.id,
    guestListId: guest.guestListId,
    status: result.updatedGuest.status,
    respondedAt: now,
    rsvpCount: result.rsvpCount,
  };
}
