import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canEditListing } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const slotSchema = z.object({
  orgId: z.string().min(1),
  listingId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(["AVAILABLE", "HOLD", "BOOKED", "UNAVAILABLE"]).default("AVAILABLE"),
  note: z.string().trim().max(240).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = slotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability details" }, { status: 400 });
  }

  const input = parsed.data;
  const listing = await prisma.listing.findFirst({
    where: { id: input.listingId, orgId: input.orgId },
    include: { org: { include: { members: true } } },
  });

  if (!listing) {
    return NextResponse.json({ error: "Service or package not found" }, { status: 404 });
  }

  if (!isAdmin(user) && !canEditListing(user, listing)) {
    return NextResponse.json({ error: "You cannot manage this service availability" }, { status: 403 });
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json({ error: "Availability end time must be after start time" }, { status: 400 });
  }

  const slot = await prisma.availabilitySlot.create({
    data: {
      listingId: listing.id,
      startAt,
      endAt,
      status: input.status,
      note: input.note,
    },
    select: { id: true, startAt: true, endAt: true, status: true, note: true },
  });

  await recordAudit({
    orgId: input.orgId,
    actorId: user.id,
    action: "pro_planner.availability.slot.created",
    target: slot.id,
    metadata: {
      listingId: listing.id,
      status: slot.status,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    },
  });

  return NextResponse.json({ slot }, { status: 201 });
}
