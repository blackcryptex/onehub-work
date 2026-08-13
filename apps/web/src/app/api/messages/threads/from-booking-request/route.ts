import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BookingRequestThreadInput = {
  bookingRequestId?: string;
};

function isVendorOrgMember(userId: string, bookingRequest: {
  listing: { org: { ownerId: string; members: Array<{ userId: string }> } };
}) {
  return bookingRequest.listing.org.ownerId === userId || bookingRequest.listing.org.members.some((member) => member.userId === userId);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as BookingRequestThreadInput;
  if (!body.bookingRequestId) {
    return NextResponse.json({ error: "bookingRequestId is required" }, { status: 400 });
  }

  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id: body.bookingRequestId },
    include: {
      event: { select: { id: true, name: true } },
      listing: {
        select: {
          id: true,
          title: true,
          orgId: true,
          org: {
            select: {
              id: true,
              name: true,
              ownerId: true,
              members: {
                select: {
                  userId: true,
                  user: { select: { id: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!bookingRequest) {
    return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
  }

  if (!isAdmin(user) && !isVendorOrgMember(user.id, bookingRequest)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subject = `Booking request: ${bookingRequest.listing.title} — ${bookingRequest.event?.name || "Event"}`;

  const existingThread = await prisma.thread.findFirst({
    where: {
      orgId: bookingRequest.listing.orgId,
      eventId: bookingRequest.eventId,
      listingId: bookingRequest.listingId,
      subject,
    },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (existingThread) return NextResponse.json({ thread: existingThread });

  const clientUser = await prisma.user.findUnique({
    where: { email: bookingRequest.contactEmail },
    select: { id: true, email: true },
  });

  const vendorParticipants = bookingRequest.listing.org.members.map((member) => ({
    email: member.user.email,
    userId: member.userId,
    roleHint: "VENDOR",
  }));
  if (!vendorParticipants.some((participant) => participant.userId === bookingRequest.listing.org.ownerId)) {
    const owner = bookingRequest.listing.org.members.find((member) => member.userId === bookingRequest.listing.org.ownerId)?.user;
    if (owner?.email) vendorParticipants.push({ email: owner.email, userId: owner.id, roleHint: "VENDOR" });
  }

  const participants = [
    ...vendorParticipants,
    { email: bookingRequest.contactEmail, userId: clientUser?.id, roleHint: "CLIENT" },
  ];

  const thread = await prisma.thread.create({
    data: {
      orgId: bookingRequest.listing.orgId,
      eventId: bookingRequest.eventId,
      listingId: bookingRequest.listingId,
      subject,
      participants: { create: participants },
    },
  });

  if (bookingRequest.message?.trim()) {
    await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: clientUser?.id,
        bodyMd: bookingRequest.message.trim(),
        attachments: [],
      },
    });
  }

  const loadedThread = await prisma.thread.findUnique({
    where: { id: thread.id },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ thread: loadedThread ?? thread });
}
