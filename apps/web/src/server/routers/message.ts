import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { requireThreadAccess } from "@/server/lib/access";

export const messageRouter = router({
  send: protectedProcedure.input(z.object({
    threadId: z.string(),
    bodyMd: z.string().min(1),
    attachments: z.array(z.string()).optional(),
  })).mutation(async ({ input, ctx }) => {
    // Caller must be authenticated and authorized on the thread; anonymous sends are rejected.
    await requireThreadAccess(ctx.user, input.threadId);
    return db.message.create({
      data: {
        threadId: input.threadId,
        senderId: ctx.user.id,
        bodyMd: input.bodyMd,
        attachments: input.attachments as unknown as string[],
      },
    });
  }),
});
