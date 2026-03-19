import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewBudget, canEditBudget } from "@/lib/rbac";

export const budgetRouter = router({
  create: publicProcedure.input(z.object({ eventId: z.string(), category: z.enum(["VENUE","CATERING","DECOR","ENTERTAINMENT","PHOTO_VIDEO","TRANSPORT","STAFF","MARKETING","MISC"]), label: z.string(), plannedCents: z.number().int().nonnegative().default(0), actualCents: z.number().int().nonnegative().default(0), vendorName: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const event = await prisma.event.findUnique({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    if (!event) throw new Error("Event not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canEditBudget(user, event)) throw new Error("Forbidden");
    return prisma.budgetLine.create({ data: input });
  }),
  update: publicProcedure.input(z.object({ id: z.string(), data: z.object({ category: z.enum(["VENUE","CATERING","DECOR","ENTERTAINMENT","PHOTO_VIDEO","TRANSPORT","STAFF","MARKETING","MISC"]).optional(), label: z.string().optional(), plannedCents: z.number().int().nonnegative().optional(), actualCents: z.number().int().nonnegative().optional(), vendorName: z.string().optional(), notes: z.string().optional() }) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const budgetLine = await prisma.budgetLine.findUnique({ where: { id: input.id }, include: { event: { include: { org: { include: { members: true } } } } } });
    if (!budgetLine) throw new Error("Budget line not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canEditBudget(user, budgetLine.event)) throw new Error("Forbidden");
    return prisma.budgetLine.update({ where: { id: input.id }, data: input.data });
  }),
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const budgetLine = await prisma.budgetLine.findUnique({ where: { id: input.id }, include: { event: { include: { org: { include: { members: true } } } } } });
    if (!budgetLine) throw new Error("Budget line not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canEditBudget(user, budgetLine.event)) throw new Error("Forbidden");
    return prisma.budgetLine.delete({ where: { id: input.id } });
  }),
  list: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const event = await prisma.event.findUnique({ where: { id: input.eventId }, include: { org: { include: { members: true } } } });
    if (!event) throw new Error("Event not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    if (!canViewBudget(user, event)) throw new Error("Forbidden");
    const lines = await prisma.budgetLine.findMany({ where: { eventId: input.eventId } });
    const totals = lines.reduce((acc, l) => { acc.planned += l.plannedCents; acc.actual += l.actualCents; return acc; }, { planned: 0, actual: 0 });
    const variance = totals.actual - totals.planned;
    return { lines, totals, variance };
  }),
});
