import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { notFound, requireEventAccess } from "@/server/lib/access";

export const taskRouter = router({
  create: protectedProcedure.input(z.object({ eventId: z.string(), title: z.string(), description: z.string().optional(), assigneeId: z.string().optional(), dueAt: z.date().optional() })).mutation(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    return db.task.create({ data: { eventId: input.eventId, title: input.title, description: input.description, assigneeId: input.assigneeId, dueAt: input.dueAt } });
  }),
  update: protectedProcedure.input(z.object({ id: z.string(), data: z.object({ title: z.string().optional(), description: z.string().optional(), status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE"]).optional(), priority: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(), assigneeId: z.string().optional(), dueAt: z.date().optional() }) })).mutation(async ({ input, ctx }) => {
    const task = await db.task.findUnique({ where: { id: input.id }, select: { eventId: true } });
    if (!task) throw notFound("Task not found");
    await requireEventAccess(ctx.user, task.eventId);
    return db.task.update({ where: { id: input.id }, data: input.data });
  }),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const task = await db.task.findUnique({ where: { id: input.id }, select: { eventId: true } });
    if (!task) throw notFound("Task not found");
    await requireEventAccess(ctx.user, task.eventId);
    return db.task.delete({ where: { id: input.id } });
  }),
  listByEvent: protectedProcedure.input(z.object({ eventId: z.string(), status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE"]).optional() })).query(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    return db.task.findMany({ where: { eventId: input.eventId, ...(input.status ? { status: input.status } : {}) }, orderBy: { createdAt: "desc" } });
  }),
});
