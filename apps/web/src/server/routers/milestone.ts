import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { recordActivity } from "@/server/lib/activity";

const _base = { id: z.string(), eventId: z.string(), title: z.string(), dueAt: z.date(), done: z.boolean().optional(), order: z.number().int().optional() };

export const milestoneRouter = router({
  create: publicProcedure.input(z.object({ eventId: z.string(), title: z.string(), dueAt: z.date() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.eventId } });
    const ms = await db.milestone.create({ data: { eventId: input.eventId, title: input.title, dueAt: input.dueAt } });
    await recordActivity({ orgId: ev.orgId, eventId: ev.id, actorId: userId, action: "MILESTONE_CREATED", target: ms.id });
    return ms;
  }),
  update: publicProcedure.input(z.object({ id: z.string(), data: z.object({ title: z.string().optional(), dueAt: z.date().optional(), done: z.boolean().optional(), order: z.number().int().optional() }) })).mutation(async ({ input }) => {
    const ms = await db.milestone.update({ where: { id: input.id }, data: input.data });
    return ms;
  }),
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await db.milestone.delete({ where: { id: input.id } });
    return true;
  }),
  list: publicProcedure.input(z.object({ eventId: z.string() })).query(({ input }) => db.milestone.findMany({ where: { eventId: input.eventId }, orderBy: { dueAt: "asc" } })),
  bulkGenerate: publicProcedure.input(z.object({ eventId: z.string(), templateKey: z.string().optional() })).mutation(async ({ input }) => {
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.eventId } });
    const start = ev.startAt;
    const plan = [-90, -60, -30, 0].map((d, i) => ({ title: d === 0 ? "Day-of" : `${Math.abs(d)} days out`, dueAt: new Date(start.getTime() + d * 24 * 60 * 60 * 1000), order: i }));
    await db.milestone.createMany({ data: plan.map((p) => ({ eventId: ev.id, title: p.title, dueAt: p.dueAt, order: p.order })) });
    return db.milestone.findMany({ where: { eventId: ev.id } });
  }),
});
