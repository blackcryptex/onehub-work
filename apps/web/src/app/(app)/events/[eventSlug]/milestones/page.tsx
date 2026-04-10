import { Card, Button, Money } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewEvent, canManageEvent } from "@/lib/rbac";
import { isDemoMode } from "@/lib/demo-mode";
import { DollarSign, TrendingUp, Info, Sparkles } from "lucide-react";
import { parseDepositMetadata, isDepositLine } from "@/lib/payment-plan-helpers";
import { PaymentPlanPageClient } from "@/components/payments/PaymentPlanPageClient";
import { getLockMap } from "@/lib/payments/payoutLock";

// Platform fee constants (demo assumptions)
const PLATFORM_FEE_BPS = 300; // 3.00%
const PROCESSING_FEE_RATE = 0.029; // 2.9%
const PROCESSING_FEE_FIXED = 30; // $0.30

export default async function EventMilestonesPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const event = await prisma.event.findFirst({
    where: { slug: params.eventSlug },
    include: {
      org: true,
      proposals: {
        include: {
          milestones: {
            orderBy: { dueDate: "asc" },
          },
          listing: {
            select: {
              id: true,
              title: true,
              category: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Check permissions
  if (!canViewEvent(user, event)) {
    notFound();
  }

  const isPlanner = user.role === "PRO_PLANNER";
  const demoModeActive = isDemoMode();

  // Get first proposal for linking deposits/payouts
  const firstProposal = event.proposals[0];

  // Separate deposits from regular milestones
  const allMilestones = event.proposals.flatMap((p) => p.milestones);
  const deposits = allMilestones.filter((m) => isDepositLine(m));
  const regularMilestones = allMilestones.filter((m) => !isDepositLine(m));

  // Fetch payouts for this event (through proposals)
  const proposalIds = event.proposals.map((p) => p.id);
  const payoutsRaw = await prisma.payout.findMany({
    where: {
      proposalId: { in: proposalIds },
      status: { not: "CANCELED" }, // Exclude soft-deleted payouts
    },
    orderBy: { createdAt: "asc" },
  });

  // Fetch listings for payouts (Payout model has listingId but no relation)
  const listingIds = payoutsRaw.map((p) => p.listingId).filter((id): id is string => !!id);
  const payoutListings = listingIds.length > 0
    ? await prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: {
          id: true,
          title: true,
          category: true,
          type: true,
        },
      })
    : [];

  const listingMap = new Map(payoutListings.map((l) => [l.id, l]));

  // Fetch proposals for payouts to check lock state
  const payoutProposalIds = payoutsRaw.map((p) => p.proposalId);
  const payoutProposals = payoutProposalIds.length > 0
    ? await prisma.proposal.findMany({
        where: { id: { in: payoutProposalIds } },
        select: {
          id: true,
          totalCents: true,
          title: true,
          status: true,
        },
      })
    : [];

  const proposalMap = new Map(payoutProposals.map((p) => [p.id, p]));

  // Get lock state map for all payouts
  const payoutIds = payoutsRaw.map((p) => p.id);
  const lockMap = await getLockMap(prisma, payoutIds);

  // Sync locked payouts that are out of sync with their proposals
  const payoutsToSync = payoutsRaw.filter((payout) => {
    const isLocked = !!lockMap[payout.id];
    if (!isLocked) return false;
    const proposal = proposalMap.get(payout.proposalId);
    if (!proposal) return false;
    // If locked but amounts don't match, sync it
    return payout.amountCents !== proposal.totalCents;
  });

  // Sync locked payouts in parallel
  if (payoutsToSync.length > 0) {
    await Promise.all(
      payoutsToSync.map((payout) => {
        const proposal = proposalMap.get(payout.proposalId);
        if (!proposal) return Promise.resolve();
        return prisma.payout
          .update({
            where: { id: payout.id },
            data: { amountCents: proposal.totalCents },
          })
          .then(() => {
            // Update local copy
            payout.amountCents = proposal.totalCents;
          })
          .catch((err) => {
            console.error(`[Payments] Failed to sync locked payout ${payout.id}:`, err);
          });
      })
    );
  }

  // Map payouts with computed lock state from lockMap
  const payouts = payoutsRaw.map((payout) => {
    const proposal = proposalMap.get(payout.proposalId);
    const isLocked = !!lockMap[payout.id];

    return {
      ...payout,
      listing: payout.listingId ? listingMap.get(payout.listingId) || null : null,
      proposal,
      isLocked,
      // For locked payouts, use proposal total as the display amount
      displayAmountCents: isLocked && proposal ? proposal.totalCents : payout.amountCents,
    };
  });

  // Fetch listings for payee selection (listings for the event city/category)
  const listings = await prisma.listing.findMany({
    where: {
      OR: [
        { city: event.venueCity || undefined },
        { state: event.venueState || undefined },
      ],
    },
    select: {
      id: true,
      title: true,
      category: true,
      type: true,
    },
    take: 50, // Limit for dropdown
  });

  // Calculate escrow summary (deposits only)
  const heldFundsBalance = deposits
    .filter((d) => d.status === "IN_ESCROW")
    .reduce((sum, d) => sum + d.amountCents, 0);

  const fundedTotal = deposits
    .filter((d) => d.status === "IN_ESCROW")
    .reduce((sum, d) => sum + d.amountCents, 0);

  const releasedTotal = payouts
    .filter((p) => p.status === "SENT")
    .reduce((sum, p) => sum + p.amountCents, 0);

  const pendingTotal = deposits
    .filter((d) => d.status === "PENDING")
    .reduce((sum, d) => sum + d.amountCents, 0);

  // Calculate OneHub revenue from released payouts
  const releasedPayouts = payouts.filter((p) => p.status === "SENT");

  const revenueBreakdown = releasedPayouts.map((payout) => {
    const gross = payout.amountCents;
    const platformFee = Math.round((gross * PLATFORM_FEE_BPS) / 10000);
    const processingFee = Math.round(
      gross * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED
    );
    const vendorPayout = gross - platformFee - processingFee;

    return {
      payout,
      gross,
      platformFee,
      processingFee,
      vendorPayout,
    };
  });

  const totalGross = revenueBreakdown.reduce((sum, r) => sum + r.gross, 0);
  const totalPlatformFee = revenueBreakdown.reduce(
    (sum, r) => sum + r.platformFee,
    0
  );
  const totalProcessingFee = revenueBreakdown.reduce(
    (sum, r) => sum + r.processingFee,
    0
  );
  const totalVendorPayout = revenueBreakdown.reduce(
    (sum, r) => sum + r.vendorPayout,
    0
  );

  const hasAcceptedProposals = event.proposals.some((p) => p.status === "ACCEPTED");

  return (
    <PaymentPlanPageClient
      event={event}
      deposits={deposits}
      payouts={payouts}
      listings={listings}
      firstProposal={firstProposal}
      isPlanner={isPlanner}
      demoModeActive={demoModeActive}
      hasAcceptedProposals={hasAcceptedProposals}
      heldFundsBalance={heldFundsBalance}
      fundedTotal={fundedTotal}
      releasedTotal={releasedTotal}
      pendingTotal={pendingTotal}
      revenueBreakdown={revenueBreakdown}
      totalGross={totalGross}
      totalPlatformFee={totalPlatformFee}
      totalProcessingFee={totalProcessingFee}
      totalVendorPayout={totalVendorPayout}
    />
  );
}
