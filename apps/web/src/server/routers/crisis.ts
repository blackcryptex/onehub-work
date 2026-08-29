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

const closeCrisisIssueSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(["RESOLVED", "CANCELED"]),
  resolutionNote: z.string().trim().min(10).max(4000),
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

function uniqueIds(ids: Array<string | null | undefined>) {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function recoveryDueAt(eventStartAt: Date | null | undefined) {
  const now = new Date();
  if (!eventStartAt || eventStartAt <= now) return addDays(now, 1);
  const oneDayFromNow = addDays(now, 1);
  return eventStartAt < oneDayFromNow ? eventStartAt : oneDayFromNow;
}

function safeAuditTrail(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
            bookingClassification: true,
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
            proposalId: true,
            title: true,
            status: true,
            paymentIntents: { select: { id: true, amountCents: true, status: true, milestoneId: true } },
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
      ? await prisma.listing.findUnique({
          where: { id: inferredListingId },
          select: { id: true, title: true, type: true, orgId: true, org: { select: { members: { select: { userId: true, role: true } } } } },
        })
      : null;

    const replacementListing = input.replacementListingId
      ? await prisma.listing.findUnique({
          where: { id: input.replacementListingId },
          select: { id: true, title: true, orgId: true, org: { select: { members: { select: { userId: true, role: true } } } } },
        })
      : null;
    if (input.replacementListingId && !replacementListing) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Replacement listing was not found" });
    }

    const stakeholderIds = uniqueIds([
      ctx.user.id,
      event.org.ownerId,
      ...event.org.members.map((member) => member.userId),
      ...((listing?.org?.members ?? [])
        .filter((member) => member.role === "OWNER" || member.role === "ADMIN")
        .map((member) => member.userId)),
      ...((replacementListing?.org?.members ?? [])
        .filter((member) => member.role === "OWNER" || member.role === "ADMIN")
        .map((member) => member.userId)),
    ]);

    const linkedMilestones = proposal?.milestones ?? [];
    const linkedPaymentIntents = input.paymentMilestoneId
      ? (contract?.paymentIntents ?? []).filter((intent) => !intent.milestoneId || intent.milestoneId === input.paymentMilestoneId)
      : contract?.paymentIntents ?? [];
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

    const { issue, replacementRequest } = await prisma.$transaction(async (tx) => {
      let replacementRequest: { id: string } | null = null;
      if (replacementListing) {
        replacementRequest = await tx.bookingRequest.create({
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

      const issue = await tx.crisisIssue.create({
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
            stakeholderNotificationIds: stakeholderIds,
          },
          workflowState: {
            notificationsPlanned: stakeholderIds.length,
            recoveryTaskDueAt: recoveryDueAt(event.startAt).toISOString(),
            budgetRiskLabel: `Crisis recovery reserve: ${input.title}`,
            paymentRiskIntentIds: linkedPaymentIntents.map((intent) => intent.id),
          },
        },
      },
      });

      await tx.task.create({
        data: {
          eventId: event.id,
          title: `Crisis review: ${input.title}`,
          description: `Crisis issue ${issue.id}. Manual event-day recovery checklist: notify stakeholders, compare replacement response ${replacementRequest?.id ?? "not started"}, review linked contract/payment context, update timeline/budget risk, and record resolution before closing. ${impactSummary}`,
          status: "TODO",
          priority: input.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          assigneeId: ctx.user.id,
          dueAt: recoveryDueAt(event.startAt),
        },
      });

      await tx.budgetLine.create({
        data: {
          eventId: event.id,
          category: listing?.type === "VENUE" ? "VENUE" : "MISC",
          label: `Crisis recovery reserve: ${input.title}`,
          plannedCents: 0,
          actualCents: 0,
          vendorName: listing?.title ?? replacementListing?.title ?? undefined,
          notes: `Non-money-moving W7 budget/payment risk marker for crisis issue ${issue.id}. Review replacement costs, refund/holdback/dispute implications, and admin approval before changing money or contracts.`,
        },
      });

      if (stakeholderIds.length > 0) {
        await tx.notification.createMany({
          data: stakeholderIds.map((userId) => ({
            userId,
            orgId: event.orgId,
            type: "CRISIS_ISSUE",
            title: `Crisis reported: ${input.title}`,
            body: `Event-day recovery risk for ${event.name}. ${replacementRequest ? "Replacement request started." : "Replacement request not started yet."} Review before refund, payout, contract, or legal decisions.`,
            link: `/pro/planner/vault/${event.slug}?crisisIssueId=${issue.id}`,
          })),
          skipDuplicates: true,
        });
      }

      for (const intent of linkedPaymentIntents) {
        await tx.paymentHoldback.upsert({
          where: { paymentIntentId: intent.id },
          create: {
            paymentIntentId: intent.id,
            proposalId: proposal?.id ?? contract?.proposalId ?? input.proposalId ?? "crisis-unlinked-proposal",
            contractId: contract?.id ?? proposal?.contract?.id ?? input.contractId ?? null,
            milestoneId: input.paymentMilestoneId ?? intent.milestoneId ?? null,
            bookingClassification: proposal?.bookingClassification ?? "MARKETPLACE",
            feeProfileSnapshot: { source: "phase7_crisis_workflow", amountCents: intent.amountCents, currency: proposal?.currency ?? "USD" },
            highRiskTriggers: { crisisIssueId: issue.id, manualRiskFlag: true, crisisIssueType: input.issueType, severity: input.severity },
            triggerSummary: `Crisis issue ${issue.id}: ${input.title}`,
            state: "ACTIVE",
            reason: "Event-day crisis payment risk review blocks release until resolution is recorded.",
            manualRiskFlag: true,
            adminDecision: "APPLIED",
            auditTrail: {
              source: "phase7_crisis_workflow",
              crisisIssueId: issue.id,
              appliedAt: new Date().toISOString(),
              noAutomaticMoneyMovement: true,
            },
          },
          update: {
            proposalId: proposal?.id ?? contract?.proposalId ?? input.proposalId ?? undefined,
            contractId: contract?.id ?? proposal?.contract?.id ?? input.contractId ?? undefined,
            milestoneId: input.paymentMilestoneId ?? intent.milestoneId ?? undefined,
            state: "ACTIVE",
            reason: "Event-day crisis payment risk review blocks release until resolution is recorded.",
            manualRiskFlag: true,
            triggerSummary: `Crisis issue ${issue.id}: ${input.title}`,
            highRiskTriggers: { crisisIssueId: issue.id, manualRiskFlag: true, crisisIssueType: input.issueType, severity: input.severity },
            auditTrail: {
              source: "phase7_crisis_workflow",
              crisisIssueId: issue.id,
              appliedAt: new Date().toISOString(),
              noAutomaticMoneyMovement: true,
            },
          },
        });
      }

      await recordActivity({
        db: tx,
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
          notificationsCreated: stakeholderIds.length,
          paymentRiskHoldbacksApplied: linkedPaymentIntents.length,
        },
      });

      return { issue, replacementRequest };
    });

    return { issue, replacementBookingRequestId: replacementRequest?.id ?? null };
  }),

  close: protectedProcedure.input(closeCrisisIssueSchema).mutation(async ({ input, ctx }) => {
    const issue = await prisma.crisisIssue.findUnique({
      where: { id: input.issueId },
      include: { event: { include: { org: { include: { members: true } } } } },
    });

    if (!issue) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Crisis issue not found" });
    }

    if (!canManageEvent(ctx.user, issue.event)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You cannot close crisis issues for this event" });
    }

    if (issue.status === "RESOLVED" || issue.status === "CANCELED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Crisis issue is already closed" });
    }

    const closed = await prisma.crisisIssue.update({
      where: { id: input.issueId },
      data: {
        status: input.status,
        manualReviewNotes: `${issue.manualReviewNotes ? `${issue.manualReviewNotes}\n\n` : ""}Resolution recorded by ${ctx.user.id}: ${input.resolutionNote}`,
        recommendedNextAction:
          input.status === "RESOLVED"
            ? "Crisis resolution recorded. Keep payment release, refunds, contract changes, and legal closeout in guarded admin review if still needed."
            : "Crisis canceled with notes. Confirm stakeholders and admin oversight are aware before changing money or contract state.",
        auditTrail: {
          ...safeAuditTrail(issue.auditTrail),
          closedAt: new Date().toISOString(),
          closedById: ctx.user.id,
          closingStatus: input.status,
          resolutionNote: input.resolutionNote,
          noAutomaticMoneyMovement: true,
        },
      },
    });

    await recordActivity({
      orgId: issue.orgId,
      eventId: issue.eventId,
      actorId: ctx.user.id,
      action: input.status === "RESOLVED" ? "CRISIS_ISSUE_RESOLVED" : "CRISIS_ISSUE_CANCELED",
      target: issue.id,
      meta: { resolutionNote: input.resolutionNote, noAutomaticMoneyMovement: true },
    });

    return closed;
  }),
});
