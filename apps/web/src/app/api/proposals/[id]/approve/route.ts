import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { acceptanceInputSchema, CURRENT_ACCEPTANCE_VERSIONS, recordAcceptance } from "@/lib/acceptance";
import { getLegalSurface } from "@/lib/legal-surface";

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
    const proposal = await prisma.proposal.findUnique({
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

    // Check if already approved
    if (proposal.status === "ACCEPTED" || proposal.status === "CONVERTED") {
      return NextResponse.json({
        message: "Proposal already approved",
        proposal,
      });
    }

    // Update proposal status to ACCEPTED
    const updatedProposal = await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED" },
    });

    const requestContextId = request.headers.get("x-request-id") || undefined;
    const bookingClassification = String((proposal as any).bookingClassification || "DIRECT").toLowerCase();
    await recordAcceptance({
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
          bookingClassification: (proposal as any).bookingClassification,
          listingId: proposal.listingId,
        },
        event: { org: { type: (proposal.event as any)?.org?.type } },
      },
      metadata: {
        requiredVersion: CURRENT_ACCEPTANCE_VERSIONS.proposal,
        proposalStatusAfter: "ACCEPTED",
      },
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
