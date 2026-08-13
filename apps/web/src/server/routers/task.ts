import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canEditEvent, canViewEvent } from "@/lib/rbac";

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const taskAssigneeInclude = { assignee: { select: { id: true, email: true, name: true } } } as const;
const taskWithEventInclude = {
  ...taskAssigneeInclude,
  event: {
    include: {
      org: { include: { members: true } },
    },
  },
} as const;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function getEventForTaskAccess(eventId: string) {
  return db.event.findUniqueOrThrow({
    where: { id: eventId },
    include: { org: { include: { members: true } } },
  });
}

async function assertAssignableOrgMember(event: Awaited<ReturnType<typeof getEventForTaskAccess>>, assigneeId?: string | null) {
  if (!assigneeId) return;
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: assigneeId, orgId: event.orgId } },
  });
  const isAssistantTeamMember = membership?.role === "MEMBER" && membership.staffRole === "ASSISTANT";
  const isCoordinatorTeamMember = membership?.role === "MEMBER" && membership.staffRole === "COORDINATOR";
  if (!isAssistantTeamMember && !isCoordinatorTeamMember) {
    throw new Error("Assignee must be an assistant or coordinator team member");
  }
}

function isAssignedTaskActor(userId: string, task: { assigneeId?: string | null }) {
  return task.assigneeId === userId;
}

function safeAssistantTaskUpdate(data: {
  status?: z.infer<typeof taskStatusSchema>;
}) {
  return "status" in data && data.status ? { status: data.status } : {};
}

const taskWriteSchema = z.object({
  eventId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueAt: z.date().optional(),
  priority: taskPrioritySchema.default("MEDIUM"),
});

const taskUpdateDataSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  dueAt: z.date().optional(),
});

export const taskRouter = router({
  create: publicProcedure.input(taskWriteSchema).mutation(async ({ input }) => {
    const user = await requireUser();
    const event = await getEventForTaskAccess(input.eventId);
    if (!canEditEvent(user, event)) throw new Error("Forbidden");
    await assertAssignableOrgMember(event, input.assigneeId);
    return db.task.create({
      data: {
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt,
        priority: input.priority,
      },
      include: taskAssigneeInclude,
    });
  }),
  update: publicProcedure.input(z.object({ id: z.string(), data: taskUpdateDataSchema })).mutation(async ({ input }) => {
    const user = await requireUser();
    const existing = await db.task.findUniqueOrThrow({
      where: { id: input.id },
      include: taskWithEventInclude,
    });

    if (canEditEvent(user, existing.event)) {
      await assertAssignableOrgMember(existing.event, input.data.assigneeId);
      return db.task.update({ where: { id: input.id }, data: input.data, include: taskAssigneeInclude });
    }

    if (!isAssignedTaskActor(user.id, existing)) throw new Error("Forbidden");
    const safeData = safeAssistantTaskUpdate(input.data);
    if (Object.keys(safeData).length === 0) throw new Error("Forbidden");
    return db.task.update({ where: { id: input.id }, data: safeData, include: taskAssigneeInclude });
  }),
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await requireUser();
    const existing = await db.task.findUniqueOrThrow({ where: { id: input.id }, include: taskWithEventInclude });
    if (!canEditEvent(user, existing.event)) throw new Error("Forbidden");
    return db.task.delete({ where: { id: input.id } });
  }),
  listByEvent: publicProcedure.input(z.object({ eventId: z.string(), status: taskStatusSchema.optional() })).query(async ({ input }) => {
    const user = await requireUser();
    const event = await getEventForTaskAccess(input.eventId);
    const managerCanView = canViewEvent(user, event) || canEditEvent(user, event);
    const where = {
      eventId: input.eventId,
      ...(input.status ? { status: input.status } : {}),
      ...(managerCanView ? {} : { assigneeId: user.id }),
    };
    return db.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: taskAssigneeInclude,
    });
  }),
  listMyAssigned: publicProcedure.input(z.object({ status: taskStatusSchema.optional() })).query(async ({ input }) => {
    const user = await requireUser();
    return db.task.findMany({
      where: { assigneeId: user.id, ...(input.status ? { status: input.status } : {}) },
      include: taskWithEventInclude,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }),
});
