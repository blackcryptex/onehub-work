import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, protectedProcedure } from "@/server/trpc";
import { recordActivity } from "@/server/lib/activity";
import { getBookingClassificationHooks } from "@/lib/booking-classification";
import { createDisputeCase, getDisputeCaseForVerification, reviewDisputeCase } from "@/lib/dispute-case";

const disputeStatusSchema = z.enum([
  "OPEN",
  "NEEDS_INFO",
  "UNDER_ADMIN_REVIEW",
  "ESCALATED",
  "RESOLVED_SELLER_FAVOR",
  "RESOLVED_REFUND",
  "REJECTED",
]);

export const disputeRouter = router({
  create: protectedProcedure.input(z.object({
    proposalId: z.string(),
    milestoneId: z.string().optional(),
    title: z.string(),
    body: z.string().optional(),
    reason: z.string().min(10),
  })).mutation(async ({ ctx, input }) => {
    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: { event: true },
    });
    const mem = await prisma.membership.findFirst({ where: { userId: ctx.user.id, orgId: proposal.event.orgId } });
    if (!mem && ctx.user.role !== "ADMIN") throw new Error("Forbidden");

    const dispute = await createDisputeCase({
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      proposalId: input.proposalId,
      milestoneId: input.milestoneId,
      title: input.title,
      body: input.body,
      reason: input.reason,
      orgId: proposal.event.orgId,
    });

    const bookingClassificationHooks = getBookingClassificationHooks(dispute.bookingClassification);

    await recordActivity({
      orgId: proposal.orgId,
      eventId: proposal.eventId,
      actorId: ctx.user.id,
      action: "DISPUTE_OPENED",
      target: dispute.id,
      meta: {
        bookingClassification: dispute.bookingClassification,
        freezeState: dispute.freezeState,
        refundDisputeRoute: bookingClassificationHooks.refundDisputeRoute,
      },
    });

    return {
      ...dispute,
      refundDisputeRoute: bookingClassificationHooks.refundDisputeRoute,
    };
  }),
  list: protectedProcedure.input(z.object({ orgSlug: z.string(), status: disputeStatusSchema.optional() })).query(async ({ ctx, input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return [];

    const membership = await prisma.membership.findFirst({ where: { userId: ctx.user.id, orgId: org.id } });
    if (!membership && ctx.user.role !== "ADMIN") throw new Error("Forbidden");

    const disputes = await (prisma as any).dispute.findMany({
      where: { orgId: org.id, ...(input.status ? { status: input.status } : {}) },
      include: { proposal: true },
      orderBy: { createdAt: "desc" },
    });

    return disputes.map((dispute: any) => ({
      ...dispute,
      refundDisputeRoute: getBookingClassificationHooks(dispute.bookingClassification).refundDisputeRoute,
    }));
  }),
  adminReview: protectedProcedure.input(z.object({
    id: z.string(),
    action: z.enum(["REQUEST_INFO", "ESCALATE", "SELLER_FAVOR", "REFUND", "REJECT", "REOPEN"]),
    decisionReason: z.string().min(3),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "ADMIN") throw new Error("Forbidden");
    const dispute = await reviewDisputeCase({
      disputeId: input.id,
      adminId: ctx.user.id,
      action: input.action,
      decisionReason: input.decisionReason,
    });

    await recordActivity({
      orgId: dispute.orgId,
      eventId: dispute.eventId ?? undefined,
      actorId: ctx.user.id,
      action: "DISPUTE_REVIEWED",
      target: dispute.id,
      meta: {
        status: dispute.status,
        freezeState: dispute.freezeState,
        resolutionType: dispute.resolutionType,
        linkedRefundRequestId: dispute.linkedRefundRequestId,
      },
    });

    return dispute;
  }),
  getForVerification: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "ADMIN") throw new Error("Forbidden");
    return getDisputeCaseForVerification(input.id);
  }),
});

