import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canMarkMilestoneComplete } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";

const markCompleteSchema = z.object({
  milestoneId: z.string(),
});

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = getRequestLogger(requestId);
  
  let user: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let body: { milestoneId?: string } | null = null;
  
  try {
    user = await getCurrentUser();
    if (!user) {
      logger.warn({ route: "/api/payments/mark-milestone-complete" }, "Unauthorized milestone completion attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    body = await request.json();
    const { milestoneId } = markCompleteSchema.parse(body);

    // Fetch milestone with contract and event
    const milestone = await prisma.paymentMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            contract: true,
            event: {
              include: {
                org: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Verify milestone is in escrow
    // Note: IN_ESCROW status will be available after Prisma migration
    if ((milestone.status as string) !== "IN_ESCROW") {
      return NextResponse.json({ error: "Milestone must be in escrow to mark as complete" }, { status: 400 });
    }

    // Verify user has permission (seller or planner can mark complete)
    const contract = milestone.proposal.contract;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const event = milestone.proposal.event;
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Centralized permission check: see apps/web/src/lib/rbac.ts
    // Note: sellerId field will be available after Prisma migration
    const isSeller = (contract as any).sellerId === user.id;
    if (!canMarkMilestoneComplete(user, event, isSeller)) {
      return NextResponse.json({ error: "Only the seller or planner can mark milestones as complete" }, { status: 403 });
    }

    // Mark milestone as ready for release (status stays IN_ESCROW, but can be released)
    // The actual release happens via the release-milestone endpoint
    // This endpoint is mainly for notification/confirmation purposes

    // Audit: Log that this milestone was marked complete
    await recordActivity({
      orgId: event.orgId,
      eventId: event.id,
      actorId: user.id,
      action: ACTIVITY_ACTIONS.MILESTONE_MARKED_COMPLETE,
      target: milestone.id,
      meta: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountCents: milestone.amountCents,
        status: milestone.status,
        markedByRole: isSeller ? "seller" : user.role,
        contractId: contract.id,
        proposalId: milestone.proposalId,
      },
    });

    // Structured logging
    logger.info({
      userId: user.id,
      milestoneId,
      orgId: event.orgId,
      eventId: event.id,
      contractId: contract.id,
      proposalId: milestone.proposalId,
      route: "/api/payments/mark-milestone-complete",
    }, "payment.milestone_marked_complete");

    return NextResponse.json({
      success: true,
      message: "Milestone marked as complete. Payment can now be released.",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to mark milestone as complete";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Structured error logging
    logger.error({
      userId: user?.id,
      milestoneId: body?.milestoneId,
      route: "/api/payments/mark-milestone-complete",
      error: errorMessage,
      stack: errorStack,
    }, "payment.milestone_mark_complete_failed");

    // Track error for monitoring
    trackError(error, {
      route: "/api/payments/mark-milestone-complete",
      userId: user?.id,
      milestoneId: body?.milestoneId,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to mark milestone as complete" }, { status: 500 });
  }
}

