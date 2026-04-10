import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateReceiptHTML } from "@/server/lib/receipt";
import { resolveBookingClassification } from "@/lib/booking-classification";
import { resolveFeeProfile } from "@/lib/fee-profile";

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
    const payout = await (prisma as any).payout.findUnique({
      where: { id: resolvedParams.id },
      include: {
        proposal: {
          select: {
            currency: true,
            bookingClassification: true,
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
            org: {
              select: {
                type: true,
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

    const bookingClassification = resolveBookingClassification({
      proposal: {
        bookingClassification: payout.proposal?.bookingClassification,
        listingId: payout.proposal?.listing?.id,
      },
      event: {
        org: {
          type: payout.proposal?.org?.type,
        },
      },
    });

    const feeProfile = resolveFeeProfile({
      bookingClassification,
      grossAmountCents: payout.amountCents,
    });

    const receiptData = {
      payoutId: payout.id,
      payoutAmountCents: feeProfile.grossAmountCents,
      vendorName: payout.proposal?.listing?.title || "Vendor",
      vendorEmail: payout.proposal?.listing?.org?.contactEmail || undefined,
      eventName: event.name,
      eventDate: event.startAt,
      platformFeeCents: feeProfile.platformFeeAmountCents,
      processingFeeCents: feeProfile.processingFeeAmountCents,
      netAmountCents: feeProfile.netAmountCents,
      releaseDate: payout.createdAt,
      currency: payout.proposal?.currency || "USD",
      feeProfile,
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

