import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateReceiptHTML } from "@/server/lib/receipt";
import { isDemoMode } from "@/lib/demo-mode";

// Platform fee constants (matching payment plan page)
const PLATFORM_FEE_BPS = 300; // 3.00%
const PROCESSING_FEE_RATE = 0.029; // 2.9%
const PROCESSING_FEE_FIXED = 30; // $0.30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const payout = await prisma.payout.findUnique({
      where: { id: resolvedParams.id },
      include: {
        proposal: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                startAt: true,
              },
            },
            listing: {
              select: {
                id: true,
                title: true,
                org: {
                  select: {
                    contactEmail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    // Only show receipt for completed payouts
    if (payout.status !== "SENT") {
      return NextResponse.json(
        { error: "Receipt only available for completed payouts" },
        { status: 400 }
      );
    }

    // Check permissions - user must be able to view the event
    const event = payout.proposal?.event;
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Calculate fees
    const gross = payout.amountCents;
    const platformFee = Math.round((gross * PLATFORM_FEE_BPS) / 10000);
    const processingFee = Math.round(gross * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED);
    const netAmount = gross - platformFee - processingFee;

    const receiptData = {
      payoutId: payout.id,
      payoutAmountCents: gross,
      vendorName: payout.proposal?.listing?.title || "Vendor",
      vendorEmail: payout.proposal?.listing?.org?.contactEmail || undefined,
      eventName: event.name,
      eventDate: event.startAt,
      platformFeeCents: platformFee,
      processingFeeCents: processingFee,
      netAmountCents: netAmount,
      releaseDate: payout.createdAt,
      currency: "USD",
    };

    const html = generateReceiptHTML(receiptData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="receipt-${payout.id}.html"`,
      },
    });
  } catch (error) {
    console.error("[API] Error generating receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}

