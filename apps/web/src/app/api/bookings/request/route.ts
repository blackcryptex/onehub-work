import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      listingId,
      eventId,
      contactName,
      contactEmail,
      contactPhone,
      startAt,
      endAt,
      guests,
      message,
    } = body;

    if (!listingId || !contactName || !contactEmail || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        org: {
          select: {
            id: true,
            ownerId: true,
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (!canManageEvent(user, event)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const parsedStartAt = new Date(startAt);
    const parsedEndAt = new Date(endAt);

    if (Number.isNaN(parsedStartAt.getTime()) || Number.isNaN(parsedEndAt.getTime())) {
      return NextResponse.json(
        { error: "Invalid startAt or endAt" },
        { status: 400 }
      );
    }

    if (parsedEndAt <= parsedStartAt) {
      return NextResponse.json(
        { error: "endAt must be after startAt" },
        { status: 400 }
      );
    }

    const parsedGuests = guests === undefined || guests === null || guests === ""
      ? null
      : Number.parseInt(String(guests), 10);

    if (parsedGuests !== null && (!Number.isFinite(parsedGuests) || parsedGuests < 1)) {
      return NextResponse.json(
        { error: "guests must be a whole number greater than 0" },
        { status: 400 }
      );
    }

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        listingId,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        guests: parsedGuests,
        message: message || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, id: bookingRequest.id });
  } catch (error) {
    console.error("[API] Error creating booking request:", error);
    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    );
  }
}

