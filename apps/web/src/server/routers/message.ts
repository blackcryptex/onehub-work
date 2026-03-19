import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";

export const messageRouter = router({
  send: publicProcedure.input(z.object({
    threadId: z.string(),
    bodyMd: z.string().min(1),
    attachments: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    return prisma.message.create({
      data: {
        threadId: input.threadId,
        senderId: userId ?? undefined,
        bodyMd: input.bodyMd,
        attachments: input.attachments as unknown as string[],
      },
    });
  }),
});

