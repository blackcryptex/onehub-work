import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { canManageEvent } from "@/lib/rbac";
import { z } from "zod";

const updateContractSchema = z.object({
  title: z.string().optional(),
  bodyMd: z.string().optional(),
});

/**
 * PATCH /api/contracts/[id]
 * Update a contract
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const contractId = resolvedParams.id;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateContractSchema.parse(body);

    // Load contract with proposal and event
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        proposal: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!contract.proposal?.event || !canManageEvent(user, contract.proposal.event)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT contracts
    if (contract.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot edit contract in current status" },
        { status: 400 }
      );
    }

    // Update contract
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(validated.title && { title: validated.title }),
        ...(validated.bodyMd !== undefined && { bodyMd: validated.bodyMd }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] Error updating contract:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

