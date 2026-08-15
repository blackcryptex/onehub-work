import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const createClientTaskSchema = z.object({
  orgId: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  clientUserId: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
});

function canUsePlannerClientSystem(user: { role?: string | null }) {
  return user.role === "PRO_PLANNER" || user.role === "ADMIN";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canUsePlannerClientSystem(user)) {
      return NextResponse.json({ error: "Only professional planners can create client follow-up tasks" }, { status: 403 });
    }

    const body = await request.json();
    const input = createClientTaskSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: input.eventId, orgId: input.orgId },
      include: {
        org: { include: { members: { where: { userId: user.id } } } },
        stakeholders: {
          where: { role: "CLIENT" },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found for this planner organization" }, { status: 404 });
    }

    if (!isAdmin(user) && !canManageEvent(user, event)) {
      return NextResponse.json({ error: "You cannot manage client tasks for this event" }, { status: 403 });
    }

    const selectedClient = input.clientUserId
      ? event.stakeholders.find((stakeholder) => stakeholder.userId === input.clientUserId)
      : null;

    if (input.clientUserId && !selectedClient) {
      return NextResponse.json({ error: "Selected client is not attached to this event" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        eventId: event.id,
        title: input.title,
        description: selectedClient
          ? `Waiting on client: ${selectedClient.user.name || selectedClient.user.email || "Client"}`
          : "Waiting on client: owner needs a client decision or response.",
        status: "TODO",
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        assigneeId: selectedClient?.userId ?? undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAudit({
      orgId: input.orgId,
      actorId: user.id,
      action: "pro_planner.client_task.created",
      target: task.id,
      metadata: {
        eventId: event.id,
        title: task.title,
        clientUserId: selectedClient?.userId ?? null,
        priority: task.priority,
      },
    });

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt,
        assignee: task.assignee,
        eventId: event.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid client task request", details: error.issues }, { status: 400 });
    }
    console.error("Error creating pro planner client task:", error);
    return NextResponse.json({ error: "Failed to create client follow-up task" }, { status: 500 });
  }
}
