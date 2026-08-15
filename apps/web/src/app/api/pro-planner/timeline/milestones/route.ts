import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const milestoneSchema = z.object({
  orgId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().trim().min(3).max(140),
  dueAt: z.string().datetime(),
  order: z.number().int().min(0).max(500).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = milestoneSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid milestone details" }, { status: 400 });
  }

  const input = parsed.data;
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, orgId: input.orgId },
    include: {
      org: { select: { id: true, ownerId: true, type: true } },
      createdBy: { select: { id: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!isAdmin(user) && !canManageEvent(user, event)) {
    return NextResponse.json({ error: "You cannot manage this event timeline" }, { status: 403 });
  }

  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
  }

  const milestone = await prisma.milestone.create({
    data: {
      eventId: event.id,
      title: input.title,
      dueAt,
      order: input.order ?? 0,
    },
    select: { id: true, title: true, dueAt: true, done: true, order: true },
  });

  await recordAudit({
    orgId: input.orgId,
    actorId: user.id,
    action: "pro_planner.timeline.milestone.created",
    target: milestone.id,
    metadata: {
      eventId: event.id,
      title: milestone.title,
      dueAt: milestone.dueAt.toISOString(),
    },
  });

  return NextResponse.json({ milestone }, { status: 201 });
}
