import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";

export const taskRouter = router({
  create: publicProcedure.input(z.object({ eventId: z.string(), title: z.string(), description: z.string().optional(), assigneeId: z.string().optional(), dueAt: z.date().optional() })).mutation(({ input }) => db.task.create({ data: { eventId: input.eventId, title: input.title, description: input.description, assigneeId: input.assigneeId, dueAt: input.dueAt } })),
  update: publicProcedure.input(z.object({ id: z.string(), data: z.object({ title: z.string().optional(), description: z.string().optional(), status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE"]).optional(), priority: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(), assigneeId: z.string().optional(), dueAt: z.date().optional() }) })).mutation(({ input }) => db.task.update({ where: { id: input.id }, data: input.data })),
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => db.task.delete({ where: { id: input.id } })),
  listByEvent: publicProcedure.input(z.object({ eventId: z.string(), status: z.enum(["TODO","IN_PROGRESS","BLOCKED","DONE"]).optional() })).query(({ input }) => db.task.findMany({ where: { eventId: input.eventId, ...(input.status ? { status: input.status } : {}) }, orderBy: { createdAt: "desc" } })),
});
