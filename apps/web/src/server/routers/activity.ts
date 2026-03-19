import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { router, publicProcedure } from "@/server/trpc";

export const activityRouter = router({
  list: publicProcedure.input(z.object({ orgSlug: z.string(), eventId: z.string().optional(), cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) })).query(async ({ input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return { items: [], nextCursor: undefined };
    const where: Prisma.ActivityWhereInput = { orgId: org.id };
    if (input.eventId) where.eventId = input.eventId;
    const items = await prisma.activity.findMany({ where, orderBy: { at: "desc" }, take: input.limit + 1, cursor: input.cursor ? { id: input.cursor } : undefined });
    let nextCursor: string | undefined;
    if (items.length > input.limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }
    return { items, nextCursor };
  }),
});
