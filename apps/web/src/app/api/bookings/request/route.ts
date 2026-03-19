import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-mode";

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

    // Get user's org (for planner org)
    const org = await prisma.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        orgId: org.id,
        eventId: eventId || null,
        listingId,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        guests: guests ? parseInt(guests) : null,
        message: message || null,
        status: "PENDING",
      },
    });

    // Demo mode: Log instead of sending email
    if (isDemoMode()) {
      console.log("[DEMO_MODE] Booking request created:", {
        id: bookingRequest.id,
        listingId,
        contactEmail,
      });
    } else {
      // TODO: Send email notification to vendor
      // await sendEmail(...)
    }

    return NextResponse.json({ success: true, id: bookingRequest.id });
  } catch (error) {
    console.error("[API] Error creating booking request:", error);
    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    );
  }
}

