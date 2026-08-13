import { NextRequest, NextResponse } from "next/server";
import { RSVPStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/server/lib/activity";

export const dynamic = "force-dynamic";

type GuestInput = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  rsvp?: "yes" | "maybe" | "no";
  meal?: string;
  notes?: string;
};

function splitName(name?: string) {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return { firstName: "Guest", lastName: "" };
  const parts = cleaned.split(/\s+/);
  const firstName = parts.shift() ?? "Guest";
  return { firstName, lastName: parts.join(" ") };
}

function toDbStatus(status?: GuestInput["rsvp"]): RSVPStatus {
  if (status === "yes") return "ACCEPTED";
  if (status === "no") return "DECLINED";
  return "PENDING";
}

function toUiGuest(guest: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: RSVPStatus;
  dietary: string | null;
  notes: string | null;
}) {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim() || guest.email || "Guest";
  return {
    id: guest.id,
    name,
    email: guest.email ?? undefined,
    phone: guest.phone ?? undefined,
    rsvp: guest.status === "ACCEPTED" ? "yes" : guest.status === "DECLINED" ? "no" : "maybe",
    meal: guest.dietary ?? undefined,
    notes: guest.notes ?? undefined,
  };
}

async function requireEventAccess(eventId: string) {
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  const role = session?.user?.role as string | undefined;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { org: { include: { members: true } } },
  });

  if (!event) return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }) };

  const member = event.org.members.some((m) => m.userId === userId);
  if (role !== "ADMIN" && event.createdById !== userId && !member) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { event, userId };
}

async function ensureGuestList(eventId: string) {
  return prisma.guestList.upsert({
    where: { eventId },
    create: { eventId, title: "Guest List" },
    update: {},
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await requireEventAccess(eventId);
  if (access.error) return access.error;

  const guestList = await prisma.guestList.findUnique({
    where: { eventId },
    include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
  });

  return NextResponse.json({ guests: guestList?.guests.map(toUiGuest) ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await requireEventAccess(eventId);
  if (access.error) return access.error;

  const body = (await request.json().catch(() => ({}))) as { guests?: GuestInput[] };
  const rows = (body.guests ?? []).filter((guest) => (guest.name ?? guest.email ?? guest.phone ?? "").trim());
  if (!rows.length) return NextResponse.json({ error: "At least one guest is required" }, { status: 400 });

  const guestList = await ensureGuestList(eventId);
  const created = [];

  for (const row of rows) {
    const { firstName, lastName } = splitName(row.name);
    const guest = await prisma.guest.create({
      data: {
        guestListId: guestList.id,
        firstName,
        lastName,
        email: row.email?.trim() || undefined,
        phone: row.phone?.trim() || undefined,
        status: toDbStatus(row.rsvp),
        dietary: row.meal?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      },
    });
    created.push(toUiGuest(guest));
  }

  await prisma.guestList.update({ where: { id: guestList.id }, data: { invited: { increment: created.length } } });
  await recordActivity({
    orgId: access.event!.orgId,
    eventId,
    actorId: access.userId!,
    action: created.length > 1 ? "GUESTS_IMPORTED" : "GUEST_CREATED",
    target: guestList.id,
    meta: { count: created.length },
  });

  return NextResponse.json({ guests: created, count: created.length });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await requireEventAccess(eventId);
  if (access.error) return access.error;

  const row = (await request.json().catch(() => ({}))) as GuestInput;
  if (!row.id) return NextResponse.json({ error: "guest id is required" }, { status: 400 });

  const existing = await prisma.guest.findUnique({ where: { id: row.id }, include: { guestList: true } });
  if (!existing || existing.guestList.eventId !== eventId) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const { firstName, lastName } = splitName(row.name);
  const updated = await prisma.guest.update({
    where: { id: row.id },
    data: {
      firstName,
      lastName,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      status: toDbStatus(row.rsvp),
      dietary: row.meal?.trim() || null,
      notes: row.notes?.trim() || null,
    },
  });

  return NextResponse.json({ guest: toUiGuest(updated) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const access = await requireEventAccess(eventId);
  if (access.error) return access.error;

  const guestId = request.nextUrl.searchParams.get("guestId");
  if (!guestId) return NextResponse.json({ error: "guestId is required" }, { status: 400 });

  const existing = await prisma.guest.findUnique({ where: { id: guestId }, include: { guestList: true } });
  if (!existing || existing.guestList.eventId !== eventId) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  await prisma.guest.delete({ where: { id: guestId } });
  await prisma.guestList.update({ where: { id: existing.guestListId }, data: { invited: { decrement: 1 } } });
  return NextResponse.json({ success: true });
}
