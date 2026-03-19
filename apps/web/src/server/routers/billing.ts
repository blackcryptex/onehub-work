import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { auth as _auth } from "@/lib/auth";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { recordAudit } from "@/server/lib/audit";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, canManageEvent, canReleaseMilestonePayment } from "@/lib/rbac";

export const billingRouter = router({
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be org admin/owner
  connectOnboard: protectedProcedure.input(z.object({ orgId: z.string() })).mutation(async ({ input, ctx }) => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: input.orgId },
      include: { members: true },
    });
    const membership = org.members.find((m) => m.userId === ctx.user.id);
    if (!isOrgAdminOrOwner(ctx.user, org, membership)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only org admins or owners can onboard Stripe Connect",
      });
    }
    const stripe = getStripeOrThrow();
    const account = await stripe.accounts.create({ type: "express" });
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing/connect`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing/connect?success=true`,
      type: "account_onboarding",
    });
    // TODO: Store account.id on Organization.stripeConnectAccountId field
    return { url: accountLink.url };
  }),
  connectStatus: publicProcedure.input(z.object({ orgId: z.string() })).query(async ({ input: _input }) => {
    // TODO: Check Organization.stripeConnectAccountId and verify status with Stripe
    return { connected: false, accountId: null };
  }),
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be able to manage the event
  escrowCreatePaymentIntent: protectedProcedure.input(z.object({
    proposalId: z.string(),
    amountCents: z.number().int().nonnegative(),
  })).mutation(async ({ input, ctx }) => {
    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: {
        escrowAccount: true,
        event: {
          include: {
            org: {
              include: { members: true },
            },
          },
        },
      },
    });
    if (!canManageEvent(ctx.user, proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to create payment intents for this proposal",
      });
    }
    if (!proposal.escrowAccount) throw new Error("Escrow account not found");
    
    // Idempotency: check if escrow already has a Stripe intent
    const stripe = getStripeOrThrow();
    if (proposal.escrowAccount.stripeIntent) {
      const existingIntent = await stripe.paymentIntents.retrieve(proposal.escrowAccount.stripeIntent);
      return { clientSecret: existingIntent.client_secret };
    }
    
    // Generate stable idempotency key
    const idempotencyKey = `escrow-${proposal.id}-${input.amountCents}`;
    
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amountCents,
        currency: proposal.currency.toLowerCase(),
        metadata: { proposalId: proposal.id, escrowAccountId: proposal.escrowAccount.id },
      },
      {
        idempotencyKey,
      }
    );
    
    // Update escrow account with Stripe intent (unique constraint prevents duplicates)
    await prisma.escrowAccount.update({
      where: { id: proposal.escrowAccount.id },
      data: { stripeIntent: intent.id },
    });
    return { clientSecret: intent.client_secret };
  }),
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be able to release milestone payments
  escrowReleaseMilestone: protectedProcedure.input(z.object({
    milestoneId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const milestone = await prisma.paymentMilestone.findUniqueOrThrow({
      where: { id: input.milestoneId },
      include: {
        proposal: {
          include: {
            listing: { include: { org: true } },
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    if (!canReleaseMilestonePayment(ctx.user, milestone.proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to release milestone payments",
      });
    }
    // TODO: Create Stripe Transfer to recipient org's Connect account
    const payout = await prisma.payout.create({
      data: {
        proposalId: milestone.proposalId,
        milestoneId: milestone.id,
        listingId: milestone.proposal.listingId ?? undefined,
        orgId: milestone.proposal.listing?.orgId ?? milestone.proposal.orgId,
        amountCents: milestone.amountCents,
      },
    });
    await prisma.paymentMilestone.update({ where: { id: milestone.id }, data: { status: "PAID" } });
    return payout;
  }),
  // SECURITY: permission check - user must be able to manage the event
  refundMilestone: publicProcedure.input(z.object({
    milestoneId: z.string(),
    amountCents: z.number().int().optional(),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    const milestone = await prisma.paymentMilestone.findUniqueOrThrow({
      where: { id: input.milestoneId },
      include: {
        proposal: {
          include: {
            escrowAccount: true,
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    if (!canManageEvent(user, milestone.proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to refund this milestone",
      });
    }
    
    const milestoneStatusBefore = milestone.status;
    const refundAmountCents = input.amountCents ?? milestone.amountCents;
    
    // TODO: Create Stripe refund via Charge ID stored in MoneyTx
    // For now, we'll log the refund initiation
    await prisma.paymentMilestone.update({
      where: { id: milestone.id },
      data: { status: "REFUNDED" },
    });
    
    // Create MoneyTx entry for the refund
    await prisma.moneyTx.create({
      data: {
        type: "REFUND",
        proposalId: milestone.proposalId,
        milestoneId: milestone.id,
        amountCents: refundAmountCents,
        currency: milestone.proposal.currency,
        meta: {
          refundedBy: user.id,
          refundedByRole: user.role,
          milestoneStatusBefore,
          milestoneStatusAfter: "REFUNDED",
          // TODO: Add stripeRefundId when Stripe refund is created
        },
      },
    });
    
    // Audit: Log that refund was initiated (Activity for event timeline)
    await recordActivity({
      orgId: milestone.proposal.event.orgId,
      eventId: milestone.proposal.eventId,
      actorId: user.id,
      action: ACTIVITY_ACTIONS.MILESTONE_REFUND_INITIATED,
      target: milestone.id,
      meta: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: refundAmountCents,
        currency: milestone.proposal.currency,
        milestoneStatusBefore,
        milestoneStatusAfter: "REFUNDED",
        refundedByRole: user.role,
        // TODO: Add stripeRefundId when Stripe refund is created
      },
    });
    
    // Audit: Also log to AuditLog for org-wide admin audit trail
    await recordAudit({
      actorId: user.id,
      orgId: milestone.proposal.event.orgId,
      action: "payment.milestone.refund",
      target: milestone.id,
      metadata: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: refundAmountCents,
        currency: milestone.proposal.currency,
        proposalId: milestone.proposalId,
        eventId: milestone.proposal.eventId,
        milestoneStatusBefore,
        milestoneStatusAfter: "REFUNDED",
        // TODO: Add stripeRefundId when Stripe refund is created
      },
    });
    
    return { success: true };
  }),
});

