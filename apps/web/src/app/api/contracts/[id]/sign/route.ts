import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isDemoMode } from "@/lib/demo-mode";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { signerName, signerEmail } = body;

    if (!signerName || !signerEmail) {
      return NextResponse.json(
        { error: "Signer name and email are required" },
        { status: 400 }
      );
    }

    // Get contract with proposal and event
    const contract = await prisma.contract.findUnique({
      where: { id: resolvedParams.id },
      include: {
        proposal: {
          include: {
            event: true,
          },
        },
        signatures: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if user already signed
    const existingSignature = contract.signatures.find(
      (s) => s.signerEmail === signerEmail
    );

    if (existingSignature && existingSignature.signedAt) {
      return NextResponse.json(
        { error: "You have already signed this contract" },
        { status: 400 }
      );
    }

    // Create or update signature
    let signature;
    if (existingSignature) {
      signature = await prisma.signature.update({
        where: { id: existingSignature.id },
        data: {
          signerName,
          signerEmail,
          signedAt: new Date(),
          method: isDemoMode() ? "DEMO" : "ELECTRONIC",
        },
      });
    } else {
      signature = await prisma.signature.create({
        data: {
          contractId: contract.id,
          signerName,
          signerEmail,
          signedAt: new Date(),
          method: isDemoMode() ? "DEMO" : "ELECTRONIC",
        },
      });
    }

    // Update contract status based on signatures
    const allSignatures = await prisma.signature.findMany({
      where: { contractId: contract.id },
    });

    const signedCount = allSignatures.filter((s) => s.signedAt).length;
    const totalSignatures = allSignatures.length;

    let newStatus = contract.status;
    if (signedCount === totalSignatures && totalSignatures > 0) {
      newStatus = "FULLY_SIGNED";
    } else if (signedCount > 0) {
      newStatus = "PARTIALLY_SIGNED";
    }

    await prisma.contract.update({
      where: { id: contract.id },
      data: { status: newStatus },
    });

    // Demo mode: Log instead of sending email
    if (isDemoMode()) {
      console.log("[DEMO_MODE] Contract signed:", {
        contractId: contract.id,
        signerEmail,
        newStatus,
      });
    } else {
      // TODO: Send email notification
      // await sendEmail(...)
    }

    return NextResponse.json({ success: true, signature, status: newStatus });
  } catch (error) {
    console.error("[API] Error signing contract:", error);
    return NextResponse.json(
      { error: "Failed to sign contract" },
      { status: 500 }
    );
  }
}

