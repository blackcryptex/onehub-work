import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

const threadResourceTypeInput = z.enum([
  "CONTRACT",
  "EVENT_TASK",
  "PAYMENT_INTENT",
  "PAYMENT_MILESTONE",
  "REFUND_REQUEST",
  "DISPUTE",
  "CRISIS_ISSUE",
]);

type ParticipantInput = z.infer<typeof participantInput>;

function badRequest(message: string): TRPCError {
  return new TRPCError({ code: "BAD_REQUEST", message });
}

async function resolveParticipants(participants: ParticipantInput[], sender: { id: string; email?: string | null }) {
  const userIds = Array.from(new Set(participants.map((participant) => participant.userId).filter((userId): userId is string => Boolean(userId))));
  const users = userIds.length > 0
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const resolved = new Map<string, ParticipantInput>();

  for (const participant of participants) {
    const canonicalUser = participant.userId ? usersById.get(participant.userId) : null;
    if (participant.userId && !canonicalUser) throw badRequest("Thread participant user was not found");
    const email = (canonicalUser?.email ?? participant.email).toLowerCase();
    const key = canonicalUser?.id ? `user:${canonicalUser.id}` : `email:${email}`;
    if (canonicalUser?.id) resolved.delete(`email:${email}`);
    if (!canonicalUser?.id && Array.from(resolved.values()).some((existing) => existing.userId && existing.email === email)) continue;
    resolved.set(key, {
      userId: canonicalUser?.id ?? undefined,
      email,
      roleHint: participant.roleHint,
    });
  }

  if (sender.email) {
    resolved.set(`user:${sender.id}`, { userId: sender.id, email: sender.email.toLowerCase(), roleHint: "SENDER" });
  }

  return Array.from(resolved.values());
}

async function validateThreadContext(input: {
  orgId: string;
  eventId?: string;
  proposalId?: string;
  listingId?: string;
  resourceType?: z.infer<typeof threadResourceTypeInput>;
  resourceId?: string;
}) {
  if (input.proposalId) {
    const proposal = await db.proposal.findUnique({
      where: { id: input.proposalId },
      select: { id: true, orgId: true, eventId: true, listingId: true },
    });
    if (!proposal) throw badRequest("Proposal context was not found");
    if (proposal.orgId !== input.orgId) throw badRequest("Thread proposal must match thread organization");
    if (input.eventId && proposal.eventId !== input.eventId) throw badRequest("Thread proposal must match event context");
    if (input.listingId && proposal.listingId && proposal.listingId !== input.listingId) {
      throw badRequest("Thread listing must match proposal listing context");
    }
  }

  if (input.listingId) {
    const listing = await db.listing.findUnique({ where: { id: input.listingId }, select: { id: true } });
    if (!listing) throw badRequest("Listing context was not found");
  }

  if (!input.resourceType && !input.resourceId) return;
  if (!input.resourceType || !input.resourceId) throw badRequest("Thread resource context requires type and id");

  switch (input.resourceType) {
    case "CONTRACT": {
      const contract = await db.contract.findUnique({ where: { id: input.resourceId }, select: { orgId: true, eventId: true, proposalId: true } });
      if (!contract) throw badRequest("Contract context was not found");
      if (contract.orgId !== input.orgId) throw badRequest("Contract context must match thread organization");
      if (input.eventId && contract.eventId !== input.eventId) throw badRequest("Contract context must match event");
      if (input.proposalId && contract.proposalId !== input.proposalId) throw badRequest("Contract context must match proposal");
      break;
    }
    case "EVENT_TASK": {
      const task = await db.task.findUnique({ where: { id: input.resourceId }, select: { eventId: true, event: { select: { orgId: true } } } });
      if (!task) throw badRequest("Task context was not found");
      if (task.event.orgId !== input.orgId) throw badRequest("Task context must match thread organization");
      if (input.eventId && task.eventId !== input.eventId) throw badRequest("Task context must match event");
      break;
    }
    case "PAYMENT_INTENT": {
      const payment = await db.paymentIntent.findUnique({
        where: { id: input.resourceId },
        select: { contract: { select: { orgId: true, eventId: true, proposalId: true } } },
      });
      if (!payment) throw badRequest("Payment context was not found");
      if (payment.contract.orgId !== input.orgId) throw badRequest("Payment context must match thread organization");
      if (input.eventId && payment.contract.eventId !== input.eventId) throw badRequest("Payment context must match event");
      if (input.proposalId && payment.contract.proposalId !== input.proposalId) throw badRequest("Payment context must match proposal");
      break;
    }
    case "PAYMENT_MILESTONE": {
      const milestone = await db.paymentMilestone.findUnique({
        where: { id: input.resourceId },
        select: { proposalId: true, proposal: { select: { orgId: true, eventId: true } } },
      });
      if (!milestone) throw badRequest("Payment milestone context was not found");
      if (milestone.proposal.orgId !== input.orgId) throw badRequest("Payment milestone context must match thread organization");
      if (input.eventId && milestone.proposal.eventId !== input.eventId) throw badRequest("Payment milestone context must match event");
      if (input.proposalId && milestone.proposalId !== input.proposalId) throw badRequest("Payment milestone context must match proposal");
      break;
    }
    case "REFUND_REQUEST": {
      const refund = await db.refundRequest.findUnique({
        where: { id: input.resourceId },
        select: { orgId: true, proposalId: true, contractId: true, proposal: { select: { eventId: true } } },
      });
      if (!refund) throw badRequest("Refund context was not found");
      if (refund.orgId !== input.orgId) throw badRequest("Refund context must match thread organization");
      if (input.eventId && refund.proposal.eventId !== input.eventId) throw badRequest("Refund context must match event");
      if (input.proposalId && refund.proposalId !== input.proposalId) throw badRequest("Refund context must match proposal");
      break;
    }
    case "DISPUTE": {
      const dispute = await db.dispute.findUnique({ where: { id: input.resourceId }, select: { orgId: true, eventId: true, proposalId: true, contractId: true } });
      if (!dispute) throw badRequest("Dispute context was not found");
      if (dispute.orgId !== input.orgId) throw badRequest("Dispute context must match thread organization");
      if (input.eventId && dispute.eventId !== input.eventId) throw badRequest("Dispute context must match event");
      if (input.proposalId && dispute.proposalId !== input.proposalId) throw badRequest("Dispute context must match proposal");
      break;
    }
    case "CRISIS_ISSUE": {
      const crisis = await db.crisisIssue.findUnique({ where: { id: input.resourceId }, select: { orgId: true, eventId: true, proposalId: true, contractId: true, paymentMilestoneId: true } });
      if (!crisis) throw badRequest("Crisis context was not found");
      if (crisis.orgId !== input.orgId) throw badRequest("Crisis context must match thread organization");
      if (input.eventId && crisis.eventId !== input.eventId) throw badRequest("Crisis context must match event");
      if (input.proposalId && crisis.proposalId !== input.proposalId) throw badRequest("Crisis context must match proposal");
      break;
    }
  }
}

export const threadRouter = router({
  create: protectedProcedure
    .input(z.object({
      orgId: z.string(),
      eventId: z.string().optional(),
      proposalId: z.string().optional(),
      listingId: z.string().optional(),
      resourceType: threadResourceTypeInput.optional(),
      resourceId: z.string().optional(),
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
      await validateThreadContext(input);
      const participants = await resolveParticipants(input.participants, ctx.user);

      return db.$transaction(async (tx) => {
        const thread = await tx.thread.create({
          data: {
            orgId: input.orgId,
            eventId: input.eventId,
            proposalId: input.proposalId,
            listingId: input.listingId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            subject: input.subject,
            visibility: input.visibility,
            purpose: input.purpose,
            participants: { create: participants },
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
          const recipientIds = Array.from(new Set(
            participants
              .map((participant) => participant.userId)
              .filter((userId): userId is string => Boolean(userId && userId !== ctx.user.id))
          ));
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
