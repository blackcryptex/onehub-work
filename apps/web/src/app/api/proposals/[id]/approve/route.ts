import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { getLegalSurface } from "@/lib/legal-surface";
import { toRuntimeBookingClassification } from "@/lib/booking-classification";
import {
  buildRequesterAcceptanceTransitionPlan,
  buildTransactionAuditEntry,
  extractBookingRequestIdFromProposalSummary,
} from "@/lib/transaction-loop";
import { recordActivity } from "@/server/lib/activity";
import {
  assertCanonicalProposalApprovalStatus,
  canonicalLifecycleHttpStatusForError,
} from "@/server/lib/lifecycle/proposal-contract-payment";

/**
 * POST /api/proposals/[id]/approve
 * Approve a proposal (set status to ACCEPTED)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const user = await getCurrentUser();

    if (!session?.user || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const proposalId = params.id;
    const body = await request.json().catch(() => ({}));
    const acceptance = acceptanceInputSchema.parse(body.acceptance);
    if (acceptance.legalVersion !== CURRENT_ACCEPTANCE_VERSIONS.proposal) {
      return NextResponse.json({ error: "Proposal acceptance version mismatch" }, { status: 400 });
    }

    if (!proposalId) {
      return NextResponse.json(
        { error: "proposalId is required" },
        { status: 400 }
      );
    }

    // Load proposal with event
    const proposal = await db.proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: {
          include: {
            org: {
              include: {
                members: {
                  where: { userId: user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canManageEvent(user, proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      assertCanonicalProposalApprovalStatus(proposal.status);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Proposal cannot be approved from its current status" },
        { status: 400 }
      );
    }

    const bookingRequestId = extractBookingRequestIdFromProposalSummary(proposal.summary);
    const requestContextId = request.headers.get("x-request-id") || undefined;
    const bookingClassification = toRuntimeBookingClassification((proposal as UnsafeAny).bookingClassification) ?? "direct";
    const updatedProposal = await db.$transaction(async (tx) => {
      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: "ACCEPTED" },
      });

      if (bookingRequestId) {
        const transition = buildRequesterAcceptanceTransitionPlan();
        const audit = buildTransactionAuditEntry({
          bookingRequestId,
          actorId: user.id,
          actorRole: "REQUESTER",
          fromState: transition.fromState,
          toState: transition.toState,
          reason: transition.reason,
        });
        await recordActivity({
          db: tx,
          orgId: proposal.event.orgId,
          eventId: proposal.eventId,
          actorId: user.id,
          action: audit.action,
          target: audit.target,
          meta: audit.meta,
        });
      }

      await recordAcceptance({
        db: tx,
        actorId: user.id,
        actorRole: user.role,
        orgId: proposal.event.orgId,
        grossAmountCents: proposal.totalCents,
        legalSurface: getLegalSurface("proposal", bookingClassification),
        legalVersion: acceptance.legalVersion,
        sourceSurface: "proposal.approve",
        requestContextId,
        proposalId: proposal.id,
        bookingClassificationInput: {
          proposal: {
            bookingClassification: (proposal as UnsafeAny).bookingClassification,
            listingId: proposal.listingId,
          },
          event: { org: { type: (proposal.event as UnsafeAny)?.org?.type } },
        },
        metadata: {
          requiredVersion: CURRENT_ACCEPTANCE_VERSIONS.proposal,
          proposalStatusAfter: "ACCEPTED",
        },
      });

      return updated;
    });

    console.log("[API] Proposal approved:", {
      proposalId: updatedProposal.id,
      status: updatedProposal.status,
    });

    return NextResponse.json(updatedProposal);
  } catch (error) {
    console.error("[API] Error approving proposal:", error);
    const message =
      error instanceof Error ? error.message : "Failed to approve proposal";
    return NextResponse.json({ error: message }, { status: canonicalLifecycleHttpStatusForError(error) });
  }
}
