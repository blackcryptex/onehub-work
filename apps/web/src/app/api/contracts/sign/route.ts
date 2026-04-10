import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * POST /api/contracts/sign
 * Sign a contract (e-signature)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = await getCurrentUser();

    if (!session?.user || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contractId } = body;

    if (!contractId) {
      return NextResponse.json(
        { error: "contractId is required" },
        { status: 400 }
      );
    }

    // Load contract with relations
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: {
                    members: true,
                  },
                },
              },
            },
            listing: {
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
        signatures: true,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Determine if user is planner/buyer or vendor/seller
    const isPlanner =
      contract.buyerId === contract.proposal.event.orgId &&
      (contract.proposal.event.org.ownerId === user.id ||
        contract.proposal.event.org.members.some((m) => m.userId === user.id));
    const isVendor =
      contract.sellerId &&
      (contract.proposal.listing?.org.ownerId === user.id ||
        contract.proposal.listing?.org.members.some((m) => m.userId === user.id));

    if (!isPlanner && !isVendor) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to sign this contract. You must be either the planner or the vendor/venue.",
        },
        { status: 403 }
      );
    }

    // Check if already signed by this party
    const existingSignature = contract.signatures.find(
      (s) => s.signerId === user.id
    );

    if (existingSignature && existingSignature.signedAt) {
      return NextResponse.json(
        {
          error: "You have already signed this contract",
          contract,
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent for audit trail
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent") || "unknown";

    // Create or update signature
    if (existingSignature) {
      await prisma.signature.update({
        where: { id: existingSignature.id },
        data: {
          signedAt: new Date(),
          method: "e-signature",
        },
      });
    } else {
      await prisma.signature.create({
        data: {
          contractId: contract.id,
          signerId: user.id,
          signerName: user.name || user.email,
          signerEmail: user.email,
          ip,
          ua,
          signedAt: new Date(),
          method: "e-signature",
        },
      });
    }

    // Reload contract to get updated signatures
    const updatedContract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        signatures: true,
      },
    });

    if (!updatedContract) {
      throw new Error("Failed to reload contract");
    }

    // Determine new status based on true dual-party execution
    const buyerMemberIds = new Set([
      contract.proposal.event.org.ownerId,
      ...contract.proposal.event.org.members.map((member) => member.userId),
    ]);
    const sellerMemberIds = new Set(
      [
        contract.proposal.listing?.org?.ownerId,
        ...(contract.proposal.listing?.org.members ?? []).map((member) => member.userId),
      ].filter((id): id is string => Boolean(id))
    );

    const plannerSigned = updatedContract.signatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && buyerMemberIds.has(signature.signerId))
    );
    const vendorSigned = updatedContract.signatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && sellerMemberIds.has(signature.signerId))
    );

    let newStatus = contract.status;

    if (plannerSigned && vendorSigned) {
      newStatus = "FULLY_SIGNED";
    } else if (plannerSigned || vendorSigned) {
      newStatus = "PARTIALLY_SIGNED";
    } else if (contract.status === "DRAFT") {
      newStatus = "OUT_FOR_SIGNATURE";
    }

    // Update contract status if changed
    if (newStatus !== contract.status) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { status: newStatus },
      });
    }

    // Reload final contract
    const finalContract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        signatures: {
          orderBy: { signedAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      contract: finalContract,
      message:
        newStatus === "FULLY_SIGNED"
          ? "Contract is now fully executed!"
          : "Contract signed successfully",
    });
  } catch (error) {
    console.error("[API] Error signing contract:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sign contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

