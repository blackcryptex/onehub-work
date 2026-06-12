import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { notFound, requireEventAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

export const milestoneRouter = router({
  create: protectedProcedure.input(z.object({ eventId: z.string(), title: z.string(), dueAt: z.date() })).mutation(async ({ input, ctx }) => {
    const ev = await requireEventAccess(ctx.user, input.eventId);
    const ms = await db.milestone.create({ data: { eventId: input.eventId, title: input.title, dueAt: input.dueAt } });
    await recordActivity({ orgId: ev.orgId, eventId: ev.id, actorId: ctx.user.id, action: "MILESTONE_CREATED", target: ms.id });
    return ms;
  }),
  update: protectedProcedure.input(z.object({ id: z.string(), data: z.object({ title: z.string().optional(), dueAt: z.date().optional(), done: z.boolean().optional(), order: z.number().int().optional() }) })).mutation(async ({ input, ctx }) => {
    const existing = await db.milestone.findUnique({ where: { id: input.id }, select: { eventId: true } });
    if (!existing) throw notFound("Milestone not found");
    await requireEventAccess(ctx.user, existing.eventId);
    const ms = await db.milestone.update({ where: { id: input.id }, data: input.data });
    return ms;
  }),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const existing = await db.milestone.findUnique({ where: { id: input.id }, select: { eventId: true } });
    if (!existing) throw notFound("Milestone not found");
    await requireEventAccess(ctx.user, existing.eventId);
    await db.milestone.delete({ where: { id: input.id } });
    return true;
  }),
  list: protectedProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    return db.milestone.findMany({ where: { eventId: input.eventId }, orderBy: { dueAt: "asc" } });
  }),
  bulkGenerate: protectedProcedure.input(z.object({ eventId: z.string(), templateKey: z.string().optional() })).mutation(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.eventId } });
    const start = ev.startAt;
    const plan = [-90, -60, -30, 0].map((d, i) => ({ title: d === 0 ? "Day-of" : `${Math.abs(d)} days out`, dueAt: new Date(start.getTime() + d * 24 * 60 * 60 * 1000), order: i }));
    await db.milestone.createMany({ data: plan.map((p) => ({ eventId: ev.id, title: p.title, dueAt: p.dueAt, order: p.order })) });
    return db.milestone.findMany({ where: { eventId: ev.id } });
  }),
});
