import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { router, protectedProcedure } from "@/server/trpc";
import { recordActivity } from "@/server/lib/activity";

const crisisIssueTypeSchema = z.enum([
  "VENDOR_CANCELLATION",
  "VENUE_CANCELLATION",
  "PROVIDER_PROBLEM",
  "PAYMENT_PROBLEM",
  "CONTRACT_PROBLEM",
  "MILESTONE_RISK",
  "OTHER",
]);

const crisisIssueSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const linkedCommercialContextSchema = z.object({
  listingId: z.string().min(1).optional(),
  bookingRequestId: z.string().min(1).optional(),
  proposalId: z.string().min(1).optional(),
  contractId: z.string().min(1).optional(),
  paymentMilestoneId: z.string().min(1).optional(),
});

const createCrisisIssueSchema = linkedCommercialContextSchema.extend({
  eventId: z.string().min(1),
  issueType: crisisIssueTypeSchema,
  severity: crisisIssueSeveritySchema.default("HIGH"),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  manualReviewNotes: z.string().trim().max(4000).optional(),
  replacementListingId: z.string().min(1).optional(),
  replacementMessage: z.string().trim().max(4000).optional(),
});

function money(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function issueTypeLabel(issueType: z.infer<typeof crisisIssueTypeSchema>) {
  return issueType.toLowerCase().replace(/_/g, " ");
}

function buildImpactSummary(input: {
  issueType: z.infer<typeof crisisIssueTypeSchema>;
  listingTitle?: string | null;
  proposalTitle?: string | null;
  proposalTotalCents?: number | null;
  proposalCurrency?: string | null;
  contractTitle?: string | null;
  contractStatus?: string | null;
  paymentIntentCount: number;
  paymentIntentCents: number;
  milestoneCount: number;
  paymentMilestoneTitle?: string | null;
}) {
  const target = input.listingTitle || input.proposalTitle || input.contractTitle || "selected provider context";
  const commercialPieces = [
    input.proposalTitle ? `proposal ${input.proposalTitle}${input.proposalTotalCents ? ` (${money(input.proposalTotalCents, input.proposalCurrency || "USD")})` : ""}` : null,
    input.contractTitle ? `contract ${input.contractTitle}${input.contractStatus ? ` (${input.contractStatus})` : ""}` : null,
    input.milestoneCount ? `${input.milestoneCount} payment milestone${input.milestoneCount === 1 ? "" : "s"}` : null,
    input.paymentMilestoneTitle ? `specific milestone ${input.paymentMilestoneTitle}` : null,
    input.paymentIntentCount ? `${input.paymentIntentCount} payment intent${input.paymentIntentCount === 1 ? "" : "s"} totaling ${money(input.paymentIntentCents, input.proposalCurrency || "USD")}` : null,
  ].filter(Boolean);

  return `${issueTypeLabel(input.issueType)} recorded for ${target}. Impact review should check ${commercialPieces.length ? commercialPieces.join(", ") : "requests, proposals, contracts, milestones, and payment state as applicable"}. No refund, release, cancellation, or legal conclusion is automatic.`;
}

function buildNextAction(input: { hasReplacementListing: boolean; replacementRequestId?: string | null }) {
  if (input.replacementRequestId) {
    return "Replacement recovery started with a new provider request. Review responses manually, compare contract/payment impact, and keep refund or legal decisions in guarded admin review.";
  }

  if (input.hasReplacementListing) {
    return "Replacement provider was selected but request creation was not completed; retry recovery from event context before changing money or contract state.";
  }

  return "Review commercial impact, notify stakeholders manually, then start replacement provider discovery from this event. Do not move funds, promise refunds, or make legal claims without manual review.";
}

export const crisisRouter = router({
  listForEvent: protectedProcedure.input(z.object({ eventId: z.string().min(1) })).query(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: { org: { include: { members: true } } },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    if (!canManageEvent(ctx.user, event)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view crisis issues for this event" });
    }

    return prisma.crisisIssue.findMany({
      where: { eventId: input.eventId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  }),

  create: protectedProcedure.input(createCrisisIssueSchema).mutation(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      include: {
        org: { include: { members: true } },
        bookingRequests: { select: { id: true, listingId: true } },
        proposals: {
          select: {
            id: true,
            title: true,
            listingId: true,
            contract: { select: { id: true, title: true, status: true } },
            milestones: { select: { id: true, title: true, status: true, amountCents: true } },
            totalCents: true,
            currency: true,
          },
        },
        contracts: {
          select: {
            id: true,
            title: true,
            status: true,
            paymentIntents: { select: { id: true, amountCents: true, status: true } },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }

    if (!canManageEvent(ctx.user, event)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You cannot create crisis issues for this event" });
    }

    const bookingRequest = input.bookingRequestId
      ? event.bookingRequests.find((request) => request.id === input.bookingRequestId)
      : null;
    const proposal = input.proposalId
      ? event.proposals.find((candidate) => candidate.id === input.proposalId)
      : null;
    const contract = input.contractId
      ? event.contracts.find((candidate) => candidate.id === input.contractId)
      : proposal?.contract
        ? event.contracts.find((candidate) => candidate.id === proposal.contract?.id) ?? null
        : null;
    const paymentMilestone = input.paymentMilestoneId
      ? event.proposals.flatMap((candidate) => candidate.milestones).find((milestone) => milestone.id === input.paymentMilestoneId)
      : null;

    if (input.bookingRequestId && !bookingRequest) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booking request is not attached to this event" });
    }
    if (input.proposalId && !proposal) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Proposal is not attached to this event" });
    }
    if (input.contractId && !contract) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contract is not attached to this event" });
    }
    if (input.paymentMilestoneId && !paymentMilestone) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Payment milestone is not attached to this event" });
    }

    const inferredListingId = input.listingId ?? proposal?.listingId ?? bookingRequest?.listingId ?? null;
    if (input.listingId) {
      const listingIsLinked =
        event.bookingRequests.some((request) => request.listingId === input.listingId) ||
        event.proposals.some((candidate) => candidate.listingId === input.listingId);
      if (!listingIsLinked) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Listing is not linked to this event through a request or proposal" });
      }
    }

    const listing = inferredListingId
      ? await prisma.listing.findUnique({ where: { id: inferredListingId }, select: { id: true, title: true, type: true } })
      : null;

    const replacementListing = input.replacementListingId
      ? await prisma.listing.findUnique({ where: { id: input.replacementListingId }, select: { id: true, title: true } })
      : null;
    if (input.replacementListingId && !replacementListing) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Replacement listing was not found" });
    }

    let replacementRequest: { id: string } | null = null;
    if (replacementListing) {
      replacementRequest = await prisma.bookingRequest.create({
        data: {
          orgId: event.orgId,
          eventId: event.id,
          listingId: replacementListing.id,
          contactName: ctx.user.name || ctx.user.email || "Planner",
          contactEmail: ctx.user.email || "planner@onehub.local",
          startAt: event.startAt,
          endAt: event.endAt,
          guests: event.guestTarget,
          message:
            input.replacementMessage ||
            `Replacement recovery request for ${event.name}. Original issue: ${input.title}. Please confirm availability and recovery terms.`,
          notes: "Replacement recovery started from crisis workflow; planner/admin manual review required before contract, refund, or payment decisions.",
        },
        select: { id: true },
      });
    }

    const linkedMilestones = proposal?.milestones ?? [];
    const linkedPaymentIntents = contract?.paymentIntents ?? [];
    const impactSummary = buildImpactSummary({
      issueType: input.issueType,
      listingTitle: listing?.title,
      proposalTitle: proposal?.title,
      proposalTotalCents: proposal?.totalCents,
      proposalCurrency: proposal?.currency,
      contractTitle: contract?.title ?? proposal?.contract?.title,
      contractStatus: contract?.status ?? proposal?.contract?.status,
      paymentIntentCount: linkedPaymentIntents.length,
      paymentIntentCents: linkedPaymentIntents.reduce((sum, intent) => sum + intent.amountCents, 0),
      milestoneCount: linkedMilestones.length,
      paymentMilestoneTitle: paymentMilestone?.title,
    });

    const issue = await prisma.crisisIssue.create({
      data: {
        orgId: event.orgId,
        eventId: event.id,
        reportedById: ctx.user.id,
        issueType: input.issueType,
        severity: input.severity,
        status: replacementRequest ? "REPLACEMENT_STARTED" : "IMPACT_REVIEW",
        title: input.title,
        description: input.description,
        listingId: listing?.id ?? null,
        bookingRequestId: bookingRequest?.id ?? null,
        proposalId: proposal?.id ?? null,
        contractId: contract?.id ?? proposal?.contract?.id ?? null,
        paymentMilestoneId: paymentMilestone?.id ?? null,
        impactSummary,
        recommendedNextAction: buildNextAction({ hasReplacementListing: Boolean(input.replacementListingId), replacementRequestId: replacementRequest?.id }),
        replacementSearchStartedAt: replacementRequest ? new Date() : null,
        replacementListingId: replacementListing?.id ?? null,
        replacementBookingRequestId: replacementRequest?.id ?? null,
        manualReviewNotes: input.manualReviewNotes || "Manual review required before refunds, payment release, contract cancellation, or legal language.",
        auditTrail: {
          source: "phase7_crisis_workflow",
          linkedContext: {
            listingId: listing?.id ?? null,
            bookingRequestId: bookingRequest?.id ?? null,
            proposalId: proposal?.id ?? null,
            contractId: contract?.id ?? proposal?.contract?.id ?? null,
            paymentMilestoneId: paymentMilestone?.id ?? null,
            replacementListingId: replacementListing?.id ?? null,
            replacementBookingRequestId: replacementRequest?.id ?? null,
          },
        },
      },
    });

    await prisma.task.create({
      data: {
        eventId: event.id,
        title: `Crisis review: ${input.title}`,
        description: `Manual review required. ${impactSummary}`,
        status: "TODO",
        priority: input.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        assigneeId: ctx.user.id,
      },
    });

    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: ctx.user.id,
      action: replacementRequest ? "CRISIS_REPLACEMENT_STARTED" : "CRISIS_ISSUE_RECORDED",
      target: issue.id,
      meta: {
        issueType: issue.issueType,
        severity: issue.severity,
        status: issue.status,
        replacementBookingRequestId: replacementRequest?.id ?? null,
        noAutomaticMoneyMovement: true,
      },
    });

    return { issue, replacementBookingRequestId: replacementRequest?.id ?? null };
  }),
});
