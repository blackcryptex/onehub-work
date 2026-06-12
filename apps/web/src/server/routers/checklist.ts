import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { notFound, requireEventAccess } from "@/server/lib/access";

export const checklistRouter = router({
  createFromTemplate: protectedProcedure.input(z.object({ eventId: z.string(), templateId: z.string().optional() })).mutation(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.eventId } });
    let template = input.templateId
      ? await db.checklistTemplate.findUnique({ where: { id: input.templateId } })
      : await db.checklistTemplate.findFirst({ where: { OR: [{ orgId: ev.orgId }, { orgId: null }], AND: [{ OR: [{ type: ev.type }, { type: null }] }] } });
    if (!template) template = await db.checklistTemplate.create({ data: { title: "Default", orgId: null, type: ev.type, items: [] } });
    const cl = await db.checklist.create({ data: { eventId: ev.id, title: template.title, templateId: template.id } });
    return cl;
  }),
  list: protectedProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    await requireEventAccess(ctx.user, input.eventId);
    return db.checklist.findMany({ where: { eventId: input.eventId }, include: { items: true } });
  }),
  addItem: protectedProcedure.input(z.object({ checklistId: z.string(), title: z.string(), description: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const checklist = await db.checklist.findUnique({ where: { id: input.checklistId }, select: { eventId: true } });
    if (!checklist) throw notFound("Checklist not found");
    await requireEventAccess(ctx.user, checklist.eventId);
    return db.checklistItem.create({ data: { checklistId: input.checklistId, title: input.title, description: input.description } });
  }),
  toggleItem: protectedProcedure.input(z.object({ id: z.string(), done: z.boolean() })).mutation(async ({ input, ctx }) => {
    const item = await db.checklistItem.findUnique({ where: { id: input.id }, select: { checklist: { select: { eventId: true } } } });
    if (!item) throw notFound("Checklist item not found");
    await requireEventAccess(ctx.user, item.checklist.eventId);
    return db.checklistItem.update({ where: { id: input.id }, data: { done: input.done } });
  }),
});
