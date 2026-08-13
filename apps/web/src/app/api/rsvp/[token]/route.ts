import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const rsvpSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  dietary: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = rsvpSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RSVP request" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { guest: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const guest = await prisma.guest.update({
    where: { id: invitation.guestId },
    data: {
      status: parsed.data.status,
      dietary: parsed.data.dietary || null,
      notes: parsed.data.notes || null,
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { respondedAt: new Date() },
  });

  const rsvped = await prisma.guest.count({
    where: {
      guestListId: guest.guestListId,
      status: { in: ["ACCEPTED", "DECLINED"] },
    },
  });

  await prisma.guestList.update({
    where: { id: guest.guestListId },
    data: { rsvped },
  });

  return NextResponse.json({ success: true, status: guest.status });
}
