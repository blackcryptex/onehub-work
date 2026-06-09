import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { auth as _auth } from "@/lib/auth";
import { getStripeOrThrow } from "@/server/lib/stripe";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { recordAudit } from "@/server/lib/audit";
import { createRefundRequest } from "@/lib/refund-request";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, canManageEvent, canReleaseMilestonePayment } from "@/lib/rbac";

export const billingRouter = router({
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be org admin/owner
  connectOnboard: protectedProcedure.input(z.object({ orgId: z.string() })).mutation(async ({ input, ctx }) => {
    const org = await db.organization.findUniqueOrThrow({
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
    const existingAccountId = org.stripeConnectAccountId;
    const account = existingAccountId
      ? await stripe.accounts.retrieve(existingAccountId)
      : await stripe.accounts.create({
          type: "express",
          country: org.country || "US",
          metadata: {
            orgId: org.id,
            orgSlug: org.slug,
          },
        });

    if (!existingAccountId) {
      await db.organization.update({
        where: { id: org.id },
        data: { stripeConnectAccountId: account.id },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/app/billing/connect`,
      return_url: `${appUrl}/app/billing/connect?success=true`,
      type: "account_onboarding",
    });
    return { url: accountLink.url, accountId: account.id };
  }),
  connectStatus: protectedProcedure.input(z.object({ orgId: z.string() })).query(async ({ input, ctx }) => {
    const org = await db.organization.findUniqueOrThrow({
      where: { id: input.orgId },
      include: { members: true },
    });

    const membership = org.members.find((m) => m.userId === ctx.user.id);
    if (!isOrgAdminOrOwner(ctx.user, org, membership)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only org admins or owners can view Stripe Connect status",
      });
    }

    if (!org.stripeConnectAccountId) {
      return {
        connected: false,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const stripe = getStripeOrThrow();
    const account = await stripe.accounts.retrieve(org.stripeConnectAccountId);

    return {
      connected: Boolean(account.charges_enabled && account.payouts_enabled),
      accountId: account.id,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
    };
  }),
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check - user must be able to manage the event
  escrowCreatePaymentIntent: protectedProcedure.input(z.object({
    proposalId: z.string(),
    amountCents: z.number().int().nonnegative(),
  })).mutation(async ({ input, ctx }) => {
    const proposal = await db.proposal.findUniqueOrThrow({
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
    await db.escrowAccount.update({
      where: { id: proposal.escrowAccount.id },
      data: { stripeIntent: intent.id },
    });
    return { clientSecret: intent.client_secret };
  }),
  // Guarded MVP: disable the legacy tRPC release surface so milestone releases can only
  // flow through the canonical /api/payments/release-milestone path with acceptance,
  // override evidence, and blocking checks.
  escrowReleaseMilestone: protectedProcedure.input(z.object({
    milestoneId: z.string(),
  })).mutation(async () => {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Milestone release via billing router is disabled. Use the canonical /api/payments/release-milestone route.",
    });
  }),
  // SECURITY: permission check - user must be able to manage the event
  refundMilestone: publicProcedure.input(z.object({
    milestoneId: z.string(),
    amountCents: z.number().int().optional(),
    reason: z.string().min(10),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    const milestone = await db.paymentMilestone.findUniqueOrThrow({
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
    
    const refundAmountCents = input.amountCents ?? milestone.amountCents;
    const refundRequest = await createRefundRequest({
      actorId: user.id,
      actorRole: user.role,
      proposalId: milestone.proposalId,
      milestoneId: milestone.id,
      amountRequestedCents: refundAmountCents,
      reason: input.reason,
      orgId: milestone.proposal.event.orgId,
    });
    
    // Audit: Log that refund was initiated (Activity for event timeline)
    await recordActivity({
      orgId: milestone.proposal.event.orgId,
      eventId: milestone.proposal.eventId,
      actorId: user.id,
      action: ACTIVITY_ACTIONS.MILESTONE_REFUND_INITIATED,
      target: refundRequest.id,
      meta: {
        refundRequestId: refundRequest.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: refundAmountCents,
        currency: milestone.proposal.currency,
        refundedByRole: user.role,
        status: "OPEN",
      },
    });
    
    // Audit: Also log to AuditLog for org-wide admin audit trail
    await recordAudit({
      actorId: user.id,
      orgId: milestone.proposal.event.orgId,
      action: "payment.milestone.refund-request.submitted",
      target: refundRequest.id,
      metadata: {
        refundRequestId: refundRequest.id,
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: refundAmountCents,
        currency: milestone.proposal.currency,
        proposalId: milestone.proposalId,
        eventId: milestone.proposal.eventId,
        status: "OPEN",
        reason: input.reason,
      },
    });
    
    return { success: true, refundRequestId: refundRequest.id };
  }),
});
