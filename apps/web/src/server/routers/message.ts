import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import { requireThreadSendAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

export const messageRouter = router({
  send: protectedProcedure
    .input(z.object({
      threadId: z.string(),
      bodyMd: z.string().min(1),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const thread = await requireThreadSendAccess(ctx.user, input.threadId);
      return db.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: {
            threadId: input.threadId,
            senderId: ctx.user.id,
            bodyMd: input.bodyMd,
            attachments: input.attachments ?? undefined,
          },
        });
        await tx.thread.update({ where: { id: input.threadId }, data: { updatedAt: new Date() } });
        const recipientIds = Array.from(new Set(
          thread.participants
            .map((participant) => participant.userId)
            .filter((userId): userId is string => Boolean(userId && userId !== ctx.user.id))
        ));
        if (recipientIds.length > 0) {
          await tx.notification.createMany({
            data: recipientIds.map((userId) => ({
              userId,
              orgId: thread.orgId,
              type: "IN_APP_MESSAGE_CREATED",
              title: "New in-app message",
              body: thread.subject,
              link: `/messages/${thread.id}`,
            })),
          });
        }
        if (thread.eventId) {
          await recordActivity({
            db: tx,
            orgId: thread.orgId,
            eventId: thread.eventId,
            actorId: ctx.user.id,
            action: "MESSAGE_CREATED",
            target: message.id,
            meta: { threadId: thread.id },
          });
        }
        return message;
      });
    }),
});
