import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import {
  canAccessThread,
  getUserOrgIds,
  requireEventManageAccess,
  requireOrgMembership,
  requireThreadAccess,
} from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

const participantInput = z.object({
  email: z.string().email(),
  userId: z.string().optional(),
  roleHint: z.string().optional(),
});

const threadVisibilityInput = z.enum(["INTERNAL", "CLIENT_VISIBLE", "PROVIDER_VISIBLE", "ALL_PARTIES"]);
const threadPurposeInput = z.enum([
  "EVENT_COORDINATION",
  "PROPOSAL",
  "BOOKING_REQUEST",
  "INTERNAL_NOTE",
  "DOCUMENT_REVIEW",
  "ADMIN_REVIEW",
]);

export const threadRouter = router({
  create: protectedProcedure
    .input(z.object({
      orgId: z.string(),
      eventId: z.string().optional(),
      proposalId: z.string().optional(),
      listingId: z.string().optional(),
      subject: z.string().min(1),
      visibility: threadVisibilityInput.default("INTERNAL"),
      purpose: threadPurposeInput.default("EVENT_COORDINATION"),
      participants: z.array(participantInput),
      firstMessage: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.eventId) {
        const event = await requireEventManageAccess(ctx.user, input.eventId);
        if (event.orgId !== input.orgId) throw new Error("Thread organization must match event organization");
      } else {
        await requireOrgMembership(ctx.user, input.orgId);
      }

      return db.$transaction(async (tx) => {
        const thread = await tx.thread.create({
          data: {
            orgId: input.orgId,
            eventId: input.eventId,
            proposalId: input.proposalId,
            listingId: input.listingId,
            subject: input.subject,
            visibility: input.visibility,
            purpose: input.purpose,
            participants: { create: input.participants },
          },
          include: { participants: true, messages: true },
        });

        let messageId: string | null = null;
        if (input.firstMessage) {
          const message = await tx.message.create({
            data: { threadId: thread.id, senderId: ctx.user.id, bodyMd: input.firstMessage },
          });
          messageId = message.id;
          await tx.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
          const recipientIds = input.participants
            .map((participant) => participant.userId)
            .filter((userId): userId is string => Boolean(userId && userId !== ctx.user.id));
          if (recipientIds.length > 0) {
            await tx.notification.createMany({
              data: recipientIds.map((userId) => ({
                userId,
                orgId: input.orgId,
                type: "IN_APP_MESSAGE_CREATED",
                title: "New in-app message",
                body: input.subject,
                link: `/messages/${thread.id}`,
              })),
            });
          }
        }

        if (input.eventId) {
          await recordActivity({
            db: tx,
            orgId: input.orgId,
            eventId: input.eventId,
            actorId: ctx.user.id,
            action: "THREAD_CREATED",
            target: thread.id,
            meta: { visibility: input.visibility, purpose: input.purpose, messageId },
          });
        }

        return tx.thread.findUnique({
          where: { id: thread.id },
          include: { participants: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
      });
    }),
  listByContext: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      proposalId: z.string().optional(),
      listingId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.eventId) await requireEventManageAccess(ctx.user, input.eventId);
      const [orgIds, threads] = await Promise.all([
        getUserOrgIds(ctx.user),
        db.thread.findMany({
          where: input,
          include: {
            participants: true,
            listing: { select: { orgId: true } },
            messages: { take: 1, orderBy: { createdAt: "desc" } },
          },
          orderBy: { updatedAt: "desc" },
        }),
      ]);
      return threads.filter((thread) => canAccessThread(ctx.user, thread, orgIds));
    }),
  get: protectedProcedure.input(z.object({ threadId: z.string() })).query(async ({ ctx, input }) => {
    await requireThreadAccess(ctx.user, input.threadId);
    return db.thread.findUnique({
      where: { id: input.threadId },
      include: { participants: true, messages: { include: { thread: true }, orderBy: { createdAt: "asc" } } },
    });
  }),
});
