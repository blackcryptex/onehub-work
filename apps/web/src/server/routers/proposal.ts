import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { logger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canSendProposal, canManageEvent } from "@/lib/rbac";

const lineItemSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  qty: z.number().default(1),
  unit: z.string().optional(),
  unitPriceCents: z.number().int().nonnegative(),
});

const milestoneSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueType: z.enum(["DATE_ABSOLUTE", "OFFSET_FROM_EVENT_START"]),
  dueDate: z.date().optional(),
  dueOffsetDays: z.number().int().optional(),
  amountCents: z.number().int().nonnegative(),
});

export const proposalRouter = router({
  create: publicProcedure.input(z.object({
    eventId: z.string(),
    listingId: z.string().optional(),
    title: z.string().min(2),
    summary: z.string().optional(),
    lineItems: z.array(lineItemSchema),
    milestones: z.array(milestoneSchema),
    terms: z.string().optional(),
    currency: z.string().default("USD"),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const ev = await db.event.findUniqueOrThrow({ where: { id: input.eventId } });
    const mem = await db.membership.findFirst({ where: { userId, orgId: ev.orgId } });
    if (!mem) throw new Error("Forbidden");
    const subtotal = input.lineItems.reduce((sum, li) => sum + li.qty * li.unitPriceCents, 0);
    const total = subtotal; // tax calculation would go here
    const proposal = await db.proposal.create({
      data: {
        orgId: ev.orgId,
        eventId: input.eventId,
        listingId: input.listingId,
        title: input.title,
        summary: input.summary,
        currency: input.currency,
        subtotalCents: subtotal,
        totalCents: total,
        terms: input.terms,
        lineItems: { create: input.lineItems.map((li) => ({ ...li, totalCents: li.qty * li.unitPriceCents })) },
        milestones: { create: input.milestones },
      },
    });
    await recordActivity({ orgId: ev.orgId, eventId: input.eventId, actorId: userId, action: "PROPOSAL_CREATED", target: proposal.id });
    
    // Structured logging
    logger.info({
      userId,
      orgId: ev.orgId,
      eventId: input.eventId,
      proposalId: proposal.id,
      route: "trpc.proposal.create",
    }, "proposal.created");
    
    return proposal;
  }),
  calculateTotals: publicProcedure.input(z.object({ proposalId: z.string() })).query(async ({ input }) => {
    const proposal = await db.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: { lineItems: true },
    });
    const subtotal = proposal.lineItems.reduce((sum, li) => sum + li.totalCents, 0);
    return { subtotalCents: subtotal, taxCents: 0, totalCents: subtotal };
  }),
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be able to send proposals for the event
  send: protectedProcedure.input(z.object({ proposalId: z.string() })).mutation(async ({ input, ctx }) => {
    const proposal = await db.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: {
        event: {
          include: {
            org: {
              include: { members: true },
            },
          },
        },
      },
    });
    if (!canSendProposal(ctx.user, proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to send this proposal",
      });
    }
    const updated = await db.proposal.update({ where: { id: input.proposalId }, data: { status: "SENT" } });
    // TODO: Create thread and post message
    await recordActivity({ orgId: proposal.orgId, eventId: proposal.eventId, actorId: ctx.user.id, action: "PROPOSAL_SENT", target: proposal.id });
    
    // Structured logging
    logger.info({
      userId: ctx.user.id,
      orgId: proposal.orgId,
      eventId: proposal.eventId,
      proposalId: proposal.id,
      route: "trpc.proposal.send",
    }, "proposal.sent");
    
    return updated;
  }),
  // Canonical proposal acceptance is POST /api/proposals/[id]/approve with legal acceptance proof.
  accept: protectedProcedure.input(z.object({ proposalId: z.string() })).mutation(async () => {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Legacy tRPC proposal.accept is disabled. Use POST /api/proposals/[id]/approve with acceptance proof.",
    });
  }),
  // SECURITY: permission check - user must be able to manage the event
  reject: publicProcedure.input(z.object({ proposalId: z.string() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    const user = await getCurrentUser();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const proposal = await db.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: {
        event: {
          include: {
            org: {
              include: { members: true },
            },
          },
        },
      },
    });
    if (!canManageEvent(user, proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to reject this proposal",
      });
    }
    const previousStatus = proposal.status;
    const updated = await db.proposal.update({
      where: { id: input.proposalId },
      data: { status: "REJECTED" },
    });
    
    // Audit: Log that this proposal was rejected
    await recordActivity({
      orgId: proposal.orgId,
      eventId: proposal.eventId,
      actorId: userId ?? undefined,
      action: ACTIVITY_ACTIONS.PROPOSAL_REJECTED,
      target: proposal.id,
      meta: {
        previousStatus,
        newStatus: "REJECTED",
      },
    });
    
    // Structured logging
    logger.info({
      userId: userId ?? undefined,
      orgId: proposal.orgId,
      eventId: proposal.eventId,
      proposalId: proposal.id,
      route: "trpc.proposal.reject",
    }, "proposal.rejected");
    
    return updated;
  }),
});

