import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isAdmin } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { eventAccessInclude, forbidden, notFound, requireAllowedEventAssignee, requireEventAccess, requireEventManageAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

const taskStatusInput = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
const taskPriorityInput = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const blockerTypeInput = z.enum(["CLIENT_RESPONSE", "PROVIDER_RESPONSE", "INTERNAL_DECISION", "EXTERNAL_DEPENDENCY", "PAYMENT_OR_CONTRACT_REVIEW", "OTHER"]);

const taskDetailsInclude = {
  assignee: { select: { id: true, email: true, name: true, role: true } },
  blockedBy: { select: { id: true, email: true, name: true, role: true } },
  completedBy: { select: { id: true, email: true, name: true, role: true } },
  dependencies: {
    include: {
      dependsOnTask: { select: { id: true, title: true, status: true, priority: true, dueAt: true } },
    },
  },
  proofs: { orderBy: { createdAt: "desc" } },
} as const;

function badRequest(message: string): TRPCError {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

function taskLink(task: { eventId: string; id: string; eventSlug?: string | null }): string {
  return `/events/${task.eventSlug ?? task.eventId}/tasks?task=${task.id}`;
}

function requireCompletionEvidence(input: { status?: string; completionNote?: string | null; proofUrl?: string | null }) {
  if (input.status !== "DONE") return;
  if (!input.completionNote?.trim() && !input.proofUrl?.trim()) {
    throw badRequest("Completing a task requires a completion note or proof URL");
  }
}

function requireBlockerEvidence(input: { status?: string; blockerReason?: string | null }) {
  if (input.status !== "BLOCKED") return;
  if (!input.blockerReason?.trim()) {
    throw badRequest("Blocking a task requires a structured blocker reason");
  }
}

function buildAccountabilityUpdate(
  actorId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    dueAt?: Date | null;
    blockerReason?: string | null;
    blockerType?: string | null;
    completionNote?: string | null;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.status === "BLOCKED") {
    const now = new Date();
    updateData.blockedAt = now;
    updateData.blockedById = actorId;
    updateData.blockerResolvedAt = null;
    updateData.blockerResolvedById = null;
    updateData.escalationLevel = 1;
    updateData.escalatedAt = now;
  }
  if (data.status === "DONE") {
    const now = new Date();
    updateData.completedAt = now;
    updateData.completedById = actorId;
    updateData.blockerResolvedAt = now;
    updateData.blockerResolvedById = actorId;
  }
  return updateData;
}

async function notifyTaskUsers(tx: Prisma.TransactionClient, task: { id: string; eventId: string; eventSlug?: string | null; orgId?: string; assigneeId?: string | null }, type: string, title: string, body: string) {
  if (!task.assigneeId || !task.orgId) return;
  await tx.notification.createMany({
    data: [{ userId: task.assigneeId, orgId: task.orgId, type, title, body, link: taskLink(task) }],
    skipDuplicates: true,
  });
}

export const taskRouter = router({
  create: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      assigneeId: z.string().optional(),
      dueAt: z.date().optional(),
      priority: taskPriorityInput.optional(),
      dependencyTaskIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await requireEventManageAccess(ctx.user, input.eventId);
      await requireAllowedEventAssignee(input.eventId, input.assigneeId);
      if (input.dependencyTaskIds?.length) {
        const dependencies = await db.task.findMany({ where: { id: { in: input.dependencyTaskIds } }, select: { id: true, eventId: true } });
        if (dependencies.length !== input.dependencyTaskIds.length || dependencies.some((task) => task.eventId !== input.eventId)) {
          throw badRequest("Task dependencies must belong to the same event");
        }
      }
      return db.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            eventId: input.eventId,
            title: input.title,
            description: input.description,
            assigneeId: input.assigneeId,
            createdById: ctx.user.id,
            dueAt: input.dueAt,
            priority: input.priority,
          },
        });
        if (input.dependencyTaskIds?.length) {
          await tx.taskDependency.createMany({
            data: input.dependencyTaskIds.map((dependsOnTaskId) => ({ taskId: task.id, dependsOnTaskId, createdById: ctx.user.id })),
            skipDuplicates: true,
          });
        }
        await recordActivity({
          db: tx,
          orgId: event.orgId,
          eventId: event.id,
          actorId: ctx.user.id,
          action: "TASK_CREATED",
          target: task.id,
          meta: { assigneeId: task.assigneeId, status: task.status, priority: task.priority, dependencyTaskIds: input.dependencyTaskIds ?? [] },
        });
        await tx.auditLog.create({ data: { actorId: ctx.user.id, orgId: event.orgId, action: "TASK_CREATED", target: task.id, metadata: { eventId: event.id, assigneeId: task.assigneeId } } });
        await notifyTaskUsers(tx, { ...task, eventSlug: event.slug, orgId: event.orgId }, "TASK_ASSIGNED", `Task assigned: ${task.title}`, "You have accountable work assigned in OneHub.");
        return task;
      });
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: taskStatusInput.optional(),
        priority: taskPriorityInput.optional(),
        assigneeId: z.string().nullable().optional(),
        dueAt: z.date().nullable().optional(),
        blockerReason: z.string().min(1).nullable().optional(),
        blockerType: blockerTypeInput.nullable().optional(),
        completionNote: z.string().min(1).nullable().optional(),
        proofUrl: z.string().url().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      requireBlockerEvidence(input.data);
      requireCompletionEvidence(input.data);
      const existing = await db.task.findUnique({ where: { id: input.id }, include: { event: true } });
      if (!existing) throw notFound("Task not found");
      const event = await requireEventManageAccess(ctx.user, existing.eventId);
      await requireAllowedEventAssignee(existing.eventId, input.data.assigneeId);
      const { proofUrl, ...dataWithoutProof } = input.data;
      const updateData = buildAccountabilityUpdate(ctx.user.id, dataWithoutProof);
      const statusChanged = input.data.status && input.data.status !== existing.status;
      return db.$transaction(async (tx) => {
        const task = await tx.task.update({ where: { id: input.id }, data: updateData });
        if (proofUrl) {
          await tx.taskProof.createMany({ data: [{ taskId: task.id, uploadedById: ctx.user.id, label: "Completion proof", urlOrMediaId: proofUrl }] });
        }
        const action = statusChanged ? `TASK_STATUS_${input.data.status}` : "TASK_UPDATED";
        await recordActivity({
          db: tx,
          orgId: event.orgId,
          eventId: event.id,
          actorId: ctx.user.id,
          action,
          target: task.id,
          meta: { beforeStatus: existing.status, afterStatus: task.status, assigneeId: task.assigneeId, blockerReason: task.blockerReason, completionNote: task.completionNote },
        });
        await tx.auditLog.create({ data: { actorId: ctx.user.id, orgId: event.orgId, action, target: task.id, metadata: { eventId: event.id, assigneeId: task.assigneeId, status: task.status } } });
        if (task.assigneeId && statusChanged) {
          await notifyTaskUsers(tx, { ...task, eventSlug: event.slug, orgId: event.orgId }, `TASK_${task.status}`, `Task ${task.status.toLowerCase().replace("_", " ")}: ${task.title}`, task.blockerReason ?? task.completionNote ?? "Task status changed.");
        }
        return task;
      });
    }),
  ownerUpdate: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["IN_PROGRESS", "BLOCKED", "DONE"]),
      blockerReason: z.string().min(1).optional(),
      blockerType: blockerTypeInput.optional(),
      completionNote: z.string().min(1).optional(),
      proofUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireBlockerEvidence(input);
      requireCompletionEvidence(input);
      const existing = await db.task.findUnique({ where: { id: input.id }, include: { event: { include: eventAccessInclude } } });
      if (!existing) throw notFound("Task not found");
      if (existing.assigneeId !== ctx.user.id && !canManageEvent(ctx.user, existing.event)) throw forbidden();
      const { proofUrl, id: _id, ...statusData } = input;
      const updateData = buildAccountabilityUpdate(ctx.user.id, statusData);
      return db.$transaction(async (tx) => {
        const task = await tx.task.update({ where: { id: input.id }, data: updateData });
        if (proofUrl) {
          await tx.taskProof.createMany({ data: [{ taskId: task.id, uploadedById: ctx.user.id, label: "Completion proof", urlOrMediaId: proofUrl }] });
        }
        const action = `TASK_STATUS_${task.status}`;
        await recordActivity({ db: tx, orgId: existing.event.orgId, eventId: existing.eventId, actorId: ctx.user.id, action, target: task.id, meta: { beforeStatus: existing.status, afterStatus: task.status, ownerAction: true } });
        await tx.auditLog.create({ data: { actorId: ctx.user.id, orgId: existing.event.orgId, action, target: task.id, metadata: { eventId: existing.eventId, ownerAction: true } } });
        await notifyTaskUsers(tx, { ...task, eventSlug: existing.event.slug, orgId: existing.event.orgId }, `TASK_${task.status}`, `Task ${task.status.toLowerCase().replace("_", " ")}: ${task.title}`, task.blockerReason ?? task.completionNote ?? "Task status changed.");
        return task;
      });
    }),
  setDependencies: protectedProcedure
    .input(z.object({ taskId: z.string(), dependsOnTaskIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.task.findUnique({ where: { id: input.taskId }, include: { event: true } });
      if (!existing) throw notFound("Task not found");
      const event = await requireEventManageAccess(ctx.user, existing.eventId);
      const uniqueIds = [...new Set(input.dependsOnTaskIds.filter((id) => id !== input.taskId))];
      if (uniqueIds.length) {
        const dependencies = await db.task.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, eventId: true } });
        if (dependencies.length !== uniqueIds.length || dependencies.some((task) => task.eventId !== existing.eventId)) {
          throw badRequest("Task dependencies must belong to the same event");
        }
      }
      return db.$transaction(async (tx) => {
        await tx.taskDependency.deleteMany({ where: { taskId: existing.id } });
        if (uniqueIds.length) {
          await tx.taskDependency.createMany({ data: uniqueIds.map((dependsOnTaskId) => ({ taskId: existing.id, dependsOnTaskId, createdById: ctx.user.id })), skipDuplicates: true });
        }
        await recordActivity({ db: tx, orgId: event.orgId, eventId: event.id, actorId: ctx.user.id, action: "TASK_DEPENDENCIES_UPDATED", target: existing.id, meta: { dependsOnTaskIds: uniqueIds } });
        await tx.auditLog.create({ data: { actorId: ctx.user.id, orgId: event.orgId, action: "TASK_DEPENDENCIES_UPDATED", target: existing.id, metadata: { eventId: event.id, dependsOnTaskIds: uniqueIds } } });
        return { taskId: existing.id, dependsOnTaskIds: uniqueIds };
      });
    }),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await db.task.findUnique({ where: { id: input.id }, include: { event: true } });
    if (!existing) throw notFound("Task not found");
    const event = await requireEventManageAccess(ctx.user, existing.eventId);
    return db.$transaction(async (tx) => {
      const task = await tx.task.delete({ where: { id: input.id } });
      await recordActivity({ db: tx, orgId: event.orgId, eventId: event.id, actorId: ctx.user.id, action: "TASK_DELETED", target: task.id });
      await tx.auditLog.create({ data: { actorId: ctx.user.id, orgId: event.orgId, action: "TASK_DELETED", target: task.id, metadata: { eventId: event.id, title: task.title } } });
      return task;
    });
  }),
  listByEvent: protectedProcedure
    .input(z.object({ eventId: z.string(), status: taskStatusInput.optional() }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.user, input.eventId);
      return db.task.findMany({
        where: { eventId: input.eventId, ...(input.status ? { status: input.status } : {}) },
        include: taskDetailsInclude,
        orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      });
    }),
  assignedToMe: protectedProcedure.query(async ({ ctx }) => {
    return db.task.findMany({
      where: { assigneeId: ctx.user.id, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
      include: { event: { select: { id: true, slug: true, name: true, orgId: true } }, ...taskDetailsInclude },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    });
  }),
  adminExecutionRisks: protectedProcedure.query(async ({ ctx }) => {
    if (!isAdmin(ctx.user)) throw forbidden();
    return db.task.findMany({
      where: {
        OR: [
          { status: "BLOCKED" },
          { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, priority: "CRITICAL" },
          { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueAt: { lt: new Date() } },
        ],
      },
      include: { event: { select: { id: true, slug: true, name: true, orgId: true } }, ...taskDetailsInclude },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }],
    });
  }),
});