import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { requireAllowedEventAssignee, requireEventAccess, requireEventManageAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

const taskStatusInput = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);
const taskPriorityInput = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const taskRouter = router({
  create: protectedProcedure
    .input(z.object({
      eventId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      assigneeId: z.string().optional(),
      dueAt: z.date().optional(),
      priority: taskPriorityInput.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const event = await requireEventManageAccess(ctx.user, input.eventId);
      await requireAllowedEventAssignee(input.eventId, input.assigneeId);
      const task = await db.task.create({
        data: {
          eventId: input.eventId,
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          dueAt: input.dueAt,
          priority: input.priority,
        },
      });
      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: ctx.user.id,
        action: "TASK_CREATED",
        target: task.id,
        meta: { assigneeId: task.assigneeId, status: task.status, priority: task.priority },
      });
      return task;
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
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.task.findUnique({ where: { id: input.id }, include: { event: true } });
      if (!existing) throw new Error("Task not found");
      const event = await requireEventManageAccess(ctx.user, existing.eventId);
      await requireAllowedEventAssignee(existing.eventId, input.data.assigneeId);
      const task = await db.task.update({ where: { id: input.id }, data: input.data });
      const statusChanged = input.data.status && input.data.status !== existing.status;
      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: ctx.user.id,
        action: statusChanged ? `TASK_STATUS_${input.data.status}` : "TASK_UPDATED",
        target: task.id,
        meta: { beforeStatus: existing.status, afterStatus: task.status, assigneeId: task.assigneeId },
      });
      return task;
    }),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await db.task.findUnique({ where: { id: input.id }, include: { event: true } });
    if (!existing) throw new Error("Task not found");
    const event = await requireEventManageAccess(ctx.user, existing.eventId);
    const task = await db.task.delete({ where: { id: input.id } });
    await recordActivity({ orgId: event.orgId, eventId: event.id, actorId: ctx.user.id, action: "TASK_DELETED", target: task.id });
    return task;
  }),
  listByEvent: protectedProcedure
    .input(z.object({ eventId: z.string(), status: taskStatusInput.optional() }))
    .query(async ({ ctx, input }) => {
      await requireEventAccess(ctx.user, input.eventId);
      return db.task.findMany({
        where: { eventId: input.eventId, ...(input.status ? { status: input.status } : {}) },
        orderBy: { createdAt: "desc" },
      });
    }),
});
