import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { maskPaymentTerminology } from "@/lib/paymentTerminology";
import { requireOrgMembership } from "@/server/lib/access";

export const auditRouter = router({
  list: protectedProcedure.input(z.object({ orgId: z.string(), cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) })).query(async ({ input, ctx }) => {
    await requireOrgMembership(ctx.user, input.orgId);
    const limit = input.limit;
    const logs = await db.auditLog.findMany({ where: { orgId: input.orgId }, orderBy: { at: "desc" }, take: limit + 1, cursor: input.cursor ? { id: input.cursor } : undefined });
    let nextCursor: string | undefined = undefined;
    if (logs.length > limit) {
      const next = logs.pop();
      nextCursor = next?.id;
    }
    return {
      items: logs.map((log) => maskPaymentTerminology(log)),
      nextCursor,
    };
  }),
});
