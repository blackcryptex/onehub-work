import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { requireEventAccess, requireEventManageAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

export const milestoneRouter = router({
  create: protectedProcedure
    .input(z.object({ eventId: z.string(), title: z.string().min(1), dueAt: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const event = await requireEventManageAccess(ctx.user, input.eventId);
      const milestone = await db.milestone.create({ data: { eventId: input.eventId, title: input.title, dueAt: input.dueAt } });
      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: ctx.user.id,
        action: "MILESTONE_CREATED",
        target: milestone.id,
      });
      return milestone;
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        title: z.string().min(1).optional(),
        dueAt: z.date().optional(),
        done: z.boolean().optional(),
        order: z.number().int().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.milestone.findUnique({ where: { id: input.id }, include: { event: true } });
      if (!existing) throw new Error("Milestone not found");
      const event = await requireEventManageAccess(ctx.user, existing.eventId);
      const milestone = await db.milestone.update({ where: { id: input.id }, data: input.data });
      const completed = input.data.done === true && !existing.done;
      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: ctx.user.id,
        action: completed ? "MILESTONE_MARKED_COMPLETE" : "MILESTONE_UPDATED",
        target: milestone.id,
        meta: { beforeDone: existing.done, afterDone: milestone.done },
      });
      return milestone;
    }),
  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await db.milestone.findUnique({ where: { id: input.id }, include: { event: true } });
    if (!existing) throw new Error("Milestone not found");
    const event = await requireEventManageAccess(ctx.user, existing.eventId);
    const milestone = await db.milestone.delete({ where: { id: input.id } });
    await recordActivity({ orgId: event.orgId, eventId: event.id, actorId: ctx.user.id, action: "MILESTONE_DELETED", target: milestone.id });
    return milestone;
  }),
  list: protectedProcedure.input(z.object({ eventId: z.string() })).query(async ({ ctx, input }) => {
    await requireEventAccess(ctx.user, input.eventId);
    return db.milestone.findMany({ where: { eventId: input.eventId }, orderBy: { dueAt: "asc" } });
  }),
  bulkGenerate: protectedProcedure.input(z.object({ eventId: z.string(), templateKey: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const event = await requireEventManageAccess(ctx.user, input.eventId);
    const start = event.startAt;
    const plan = [-90, -60, -30, 0].map((d, i) => ({
      title: d === 0 ? "Day-of" : `${Math.abs(d)} days out`,
      dueAt: new Date(start.getTime() + d * 24 * 60 * 60 * 1000),
      order: i,
    }));
    await db.milestone.createMany({ data: plan.map((p) => ({ eventId: event.id, title: p.title, dueAt: p.dueAt, order: p.order })) });
    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: ctx.user.id,
      action: "MILESTONE_BULK_GENERATED",
      meta: { templateKey: input.templateKey ?? null, count: plan.length },
    });
    return db.milestone.findMany({ where: { eventId: event.id }, orderBy: { dueAt: "asc" } });
  }),
});
