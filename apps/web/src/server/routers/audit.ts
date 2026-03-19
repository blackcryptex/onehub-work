import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";

export const auditRouter = router({
  list: publicProcedure.input(z.object({ orgId: z.string().optional(), cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) }).optional()).query(async ({ input }) => {
    const limit = input?.limit ?? 20;
    const where = input?.orgId ? { orgId: input.orgId } : {};
    const logs = await prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, take: limit + 1, cursor: input?.cursor ? { id: input.cursor } : undefined });
    let nextCursor: string | undefined = undefined;
    if (logs.length > limit) {
      const next = logs.pop();
      nextCursor = next?.id;
    }
    return { items: logs, nextCursor };
  }),
});
