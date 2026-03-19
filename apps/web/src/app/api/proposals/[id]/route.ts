import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { z } from "zod";

const updateProposalSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  terms: z.string().optional(),
  subtotalCents: z.number().optional(),
  taxCents: z.number().optional(),
  totalCents: z.number().optional(),
});

/**
 * PATCH /api/proposals/[id]
 * Update a proposal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const proposalId = resolvedParams.id;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateProposalSchema.parse(body);

    // Load proposal with event
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: true,
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

    // Only allow editing DRAFT or SENT proposals
    if (proposal.status !== "DRAFT" && proposal.status !== "SENT") {
      return NextResponse.json(
        { error: "Cannot edit proposal in current status" },
        { status: 400 }
      );
    }

    // Update proposal
    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        ...(validated.title && { title: validated.title }),
        ...(validated.summary !== undefined && { summary: validated.summary }),
        ...(validated.terms !== undefined && { terms: validated.terms }),
        ...(validated.subtotalCents !== undefined && { subtotalCents: validated.subtotalCents }),
        ...(validated.taxCents !== undefined && { taxCents: validated.taxCents }),
        ...(validated.totalCents !== undefined && { totalCents: validated.totalCents }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Error updating proposal:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/proposals/[id]
 * Soft delete/archive a proposal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const proposalId = resolvedParams.id;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load proposal with event
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: true,
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

    // Soft delete: set status to REJECTED (or use metadata if available)
    // Check if Proposal model has deletedAt or archivedAt field
    // For now, we'll use status REJECTED as a soft delete marker
    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED", // Using REJECTED as soft delete marker
      },
    });

    return NextResponse.json({ success: true, proposal: updated });
  } catch (error) {
    console.error("[API] Error deleting proposal:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

