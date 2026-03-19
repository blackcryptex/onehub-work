import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";

export const checklistRouter = router({
  createFromTemplate: publicProcedure.input(z.object({ eventId: z.string(), templateId: z.string().optional() })).mutation(async ({ input }) => {
    const ev = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
    let template = input.templateId
      ? await prisma.checklistTemplate.findUnique({ where: { id: input.templateId } })
      : await prisma.checklistTemplate.findFirst({ where: { OR: [{ orgId: ev.orgId }, { orgId: null }], AND: [{ OR: [{ type: ev.type }, { type: null }] }] } });
    if (!template) template = await prisma.checklistTemplate.create({ data: { title: "Default", orgId: null, type: ev.type, items: [] } });
    const cl = await prisma.checklist.create({ data: { eventId: ev.id, title: template.title, templateId: template.id } });
    return cl;
  }),
  list: publicProcedure.input(z.object({ eventId: z.string() })).query(({ input }) => prisma.checklist.findMany({ where: { eventId: input.eventId }, include: { items: true } })),
  addItem: publicProcedure.input(z.object({ checklistId: z.string(), title: z.string(), description: z.string().optional() })).mutation(({ input }) => prisma.checklistItem.create({ data: { checklistId: input.checklistId, title: input.title, description: input.description } })),
  toggleItem: publicProcedure.input(z.object({ id: z.string(), done: z.boolean() })).mutation(({ input }) => prisma.checklistItem.update({ where: { id: input.id }, data: { done: input.done } })),
});
