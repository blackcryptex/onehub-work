import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const internalNoteSchema = z.object({
  orgId: z.string().min(1),
  eventId: z.string().min(1),
  bodyMd: z.string().trim().min(3).max(4000),
});

function canUsePlannerFileHub(user: { role?: string | null }) {
  return user.role === "PRO_PLANNER" || user.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canUsePlannerFileHub(user)) {
      return NextResponse.json({ error: "Only professional planners can save internal planner notes" }, { status: 403 });
    }

    const input = internalNoteSchema.parse(await request.json());
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, orgId: input.orgId },
      include: { org: { include: { members: { where: { userId: user.id } } } } },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found for this planner organization" }, { status: 404 });
    }

    if (!isAdmin(user) && !canManageEvent(user, event)) {
      return NextResponse.json({ error: "You cannot manage internal notes for this event" }, { status: 403 });
    }

    const participantEmail = user.email || "planner@onehub.local";
    const subject = "Internal planner notes";
    const thread = await prisma.thread.findFirst({
      where: { orgId: input.orgId, eventId: input.eventId, subject },
      include: { participants: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const savedThread = thread
      ? await prisma.thread.update({
          where: { id: thread.id },
          data: {
            messages: {
              create: {
                senderId: user.id,
                bodyMd: input.bodyMd,
                attachments: [],
              },
            },
          },
          include: { participants: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : await prisma.thread.create({
          data: {
            orgId: input.orgId,
            eventId: input.eventId,
            subject,
            participants: { create: [{ userId: user.id, email: participantEmail, roleHint: "internal" }] },
            messages: {
              create: {
                senderId: user.id,
                bodyMd: input.bodyMd,
                attachments: [],
              },
            },
          },
          include: { participants: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        });

    await recordAudit({
      orgId: input.orgId,
      actorId: user.id,
      action: "pro_planner.files.internal_note.created",
      target: savedThread.id,
      metadata: { eventId: input.eventId, visibility: "internal" },
    });

    return NextResponse.json({ thread: savedThread }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid internal planner note", details: error.issues }, { status: 400 });
    }
    console.error("Error saving pro planner internal note:", error);
    return NextResponse.json({ error: "Failed to save internal planner note" }, { status: 500 });
  }
}
