import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const E2E_PASSWORD = "OneHubE2E!12345";
const BUYER_EMAIL = "slice5-buyer@onehub-e2e.local";
const SELLER_EMAIL = "slice5-seller@onehub-e2e.local";
const ADMIN_EMAIL = "slice5-admin@onehub-e2e.local";
const BUYER_ORG_SLUG = "slice5-buyer-org";
const SELLER_ORG_SLUG = "slice5-seller-org";
const EVENT_NAME = "Slice 5 Payment E2E Gala";
const LISTING_SLUG = "slice5-payment-e2e-venue";
const PROPOSAL_TITLE = "Slice 5 signed payment proposal";
const MILESTONE_TITLE = "Slice 5 escrow milestone";
const CONTRACT_TITLE = "Slice 5 fully signed contract";

function assertE2eMode() {
  if (process.env.NODE_ENV === "production" || process.env.ONEHUB_E2E_TEST_MODE !== "1") {
    return NextResponse.json({ error: "E2E test mode is disabled" }, { status: 404 });
  }
  return null;
}

async function cleanExistingE2eData() {
  const users = await prisma.user.findMany({
    where: { email: { in: [BUYER_EMAIL, SELLER_EMAIL, ADMIN_EMAIL] } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const orgs = await prisma.organization.findMany({
    where: { slug: { in: [BUYER_ORG_SLUG, SELLER_ORG_SLUG] } },
    select: { id: true },
  });
  const orgIds = orgs.map((org) => org.id);

  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { title: PROPOSAL_TITLE },
        { orgId: { in: orgIds.length ? orgIds : ["__none__"] } },
      ],
    },
    select: { id: true },
  });
  const proposalIds = proposals.map((proposal) => proposal.id);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { name: EVENT_NAME },
        { orgId: { in: orgIds.length ? orgIds : ["__none__"] } },
      ],
    },
    select: { id: true },
  });
  const eventIds = events.map((event) => event.id);

  const paymentIntents = await prisma.paymentIntent.findMany({
    where: { contract: { proposalId: { in: proposalIds.length ? proposalIds : ["__none__"] } } },
    select: { id: true },
  });
  const paymentIntentIds = paymentIntents.map((intent) => intent.id);

  await prisma.adminOverride.deleteMany({ where: { OR: [{ proposalId: { in: proposalIds } }, { actorId: { in: userIds } }] } });
  await prisma.acceptanceCapture.deleteMany({ where: { OR: [{ proposalId: { in: proposalIds } }, { actorId: { in: userIds } }] } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { actorId: { in: userIds } }] } });
  await prisma.activity.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { eventId: { in: eventIds } }, { actorId: { in: userIds } }] } });
  await prisma.moneyTx.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.transaction.deleteMany({ where: { paymentIntentId: { in: paymentIntentIds } } });
  await prisma.refundRequest.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.dispute.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.paymentHoldback.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.payout.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.paymentIntent.deleteMany({ where: { id: { in: paymentIntentIds } } });
  await prisma.escrowAccount.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.paymentMilestone.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.signature.deleteMany({ where: { contract: { proposalId: { in: proposalIds } } } });
  await prisma.contract.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.proposalLineItem.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.proposalSection.deleteMany({ where: { proposalId: { in: proposalIds } } });
  await prisma.proposal.deleteMany({ where: { id: { in: proposalIds } } });
  await prisma.shortlistItem.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.listing.deleteMany({ where: { slug: LISTING_SLUG } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  await prisma.membership.deleteMany({ where: { OR: [{ orgId: { in: orgIds } }, { userId: { in: userIds } }] } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function seedScenario() {
  await cleanExistingE2eData();
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  const now = new Date();
  const eventStart = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const eventEnd = new Date(eventStart.getTime() + 4 * 60 * 60 * 1000);

  const buyer = await prisma.user.create({ data: { email: BUYER_EMAIL, name: "Slice 5 Buyer", password: passwordHash, role: "CLIENT" } });
  const seller = await prisma.user.create({ data: { email: SELLER_EMAIL, name: "Slice 5 Seller", password: passwordHash, role: "VENDOR" } });
  const admin = await prisma.user.create({ data: { id: "slice5-e2e-admin", email: ADMIN_EMAIL, name: "Slice 5 Admin", password: passwordHash, role: "ADMIN" } });

  const buyerOrg = await prisma.organization.create({ data: { name: "Slice 5 Buyer Org", slug: BUYER_ORG_SLUG, type: "PLANNER", ownerId: buyer.id, contactEmail: BUYER_EMAIL } });
  const sellerOrg = await prisma.organization.create({ data: { name: "Slice 5 Seller Org", slug: SELLER_ORG_SLUG, type: "VENDOR", ownerId: seller.id, contactEmail: SELLER_EMAIL, stripeConnectAccountId: "acct_slice5_fake_seller" } });
  await prisma.membership.createMany({ data: [
    { userId: buyer.id, orgId: buyerOrg.id, role: "OWNER" },
    { userId: seller.id, orgId: sellerOrg.id, role: "OWNER" },
  ] });

  const event = await prisma.event.create({
    data: {
      orgId: buyerOrg.id,
      createdById: buyer.id,
      name: EVENT_NAME,
      slug: "slice5-payment-e2e-gala",
      type: "WEDDING",
      startAt: eventStart,
      endAt: eventEnd,
      status: "PLANNING",
      budgetCents: 250000,
    },
  });
  const listing = await prisma.listing.create({ data: { orgId: sellerOrg.id, slug: LISTING_SLUG, title: "Slice 5 E2E Venue", type: "VENUE", category: "VENUE_SPACE", description: "Deterministic mocked-Stripe venue", email: SELLER_EMAIL, city: "Austin", state: "TX", country: "US" } });
  const proposal = await prisma.proposal.create({ data: { orgId: sellerOrg.id, eventId: event.id, listingId: listing.id, title: PROPOSAL_TITLE, summary: "Deterministic payment E2E proposal", status: "ACCEPTED", bookingClassification: "DIRECT", currency: "USD", subtotalCents: 120000, taxCents: 0, totalCents: 120000, terms: "E2E mocked Stripe only" } });
  await prisma.proposalLineItem.create({ data: { proposalId: proposal.id, label: "Venue milestone", qty: 1, unit: "event", unitPriceCents: 120000, totalCents: 120000 } });
  const milestone = await prisma.paymentMilestone.create({ data: { proposalId: proposal.id, title: MILESTONE_TITLE, description: "Fund and release through mocked Stripe", dueType: "DATE_ABSOLUTE", dueDate: eventStart, amountCents: 120000, status: "PENDING" } });
  const contract = await prisma.contract.create({ data: { proposalId: proposal.id, orgId: sellerOrg.id, eventId: event.id, title: CONTRACT_TITLE, bodyMd: "# Slice 5 E2E Contract\n\nSigned deterministic payment contract.", status: "FULLY_SIGNED", buyerId: buyerOrg.id, sellerId: sellerOrg.id, platformFeePercent: 5 } });
  await prisma.signature.createMany({ data: [
    { contractId: contract.id, signerId: buyer.id, signerName: "Slice 5 Buyer", signerEmail: BUYER_EMAIL, signedAt: now, method: "e2e" },
    { contractId: contract.id, signerId: seller.id, signerName: "Slice 5 Seller", signerEmail: SELLER_EMAIL, signedAt: now, method: "e2e" },
  ] });
  const escrowAccount = await prisma.escrowAccount.create({ data: { orgId: buyerOrg.id, eventId: event.id, proposalId: proposal.id, currency: "USD", status: "OPEN", balanceCents: 0 } });

  return {
    users: { buyer: { id: buyer.id, email: BUYER_EMAIL, password: E2E_PASSWORD }, admin: { id: admin.id, email: ADMIN_EMAIL, password: E2E_PASSWORD }, seller: { id: seller.id, email: SELLER_EMAIL } },
    buyerOrgId: buyerOrg.id,
    sellerOrgId: sellerOrg.id,
    eventId: event.id,
    listingId: listing.id,
    proposalId: proposal.id,
    contractId: contract.id,
    milestoneId: milestone.id,
    escrowAccountId: escrowAccount.id,
    amountCents: milestone.amountCents,
    paymentAcceptance: { legalVersion: "payment-guarded-mvp-v1", accepted: true },
    adminOverrideAcceptance: { legalVersion: "admin-override-guarded-mvp-v1", accepted: true },
  };
}

async function inspectScenario(proposalId: string, milestoneId: string, paymentIntentId?: string, payoutId?: string) {
  const [proposal, milestone, paymentIntent, escrowAccount, payout, moneyTx, activities, audits, acceptances, blockers] = await Promise.all([
    prisma.proposal.findUnique({ where: { id: proposalId }, include: { milestones: true, contract: true } }),
    prisma.paymentMilestone.findUnique({ where: { id: milestoneId } }),
    paymentIntentId ? prisma.paymentIntent.findUnique({ where: { id: paymentIntentId }, include: { transactions: true } }) : null,
    prisma.escrowAccount.findUnique({ where: { proposalId } }),
    payoutId ? prisma.payout.findUnique({ where: { id: payoutId } }) : prisma.payout.findFirst({ where: { milestoneId } }),
    prisma.moneyTx.findMany({ where: { proposalId }, orderBy: { at: "desc" } }),
    prisma.activity.findMany({ where: { target: milestoneId }, orderBy: { at: "desc" } }),
    prisma.auditLog.findMany({ where: { target: milestoneId }, orderBy: { at: "desc" } }),
    prisma.acceptanceCapture.findMany({ where: { proposalId }, orderBy: { acceptedAt: "desc" } }),
    prisma.refundRequest.findMany({ where: { proposalId, milestoneId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { proposal, milestone, paymentIntent, escrowAccount, payout, moneyTx, activities, audits, acceptances, blockers };
}

export async function POST(request: NextRequest) {
  const guard = assertE2eMode();
  if (guard) return guard;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "seed");

  if (action === "seed") {
    return NextResponse.json(await seedScenario());
  }

  if (action === "add-refund-blocker") {
    const { proposalId, contractId, milestoneId, paymentIntentId, orgId, actorId, amountCents } = body;
    const blocker = await prisma.refundRequest.create({
      data: {
        orgId,
        actorId,
        actorRole: "CLIENT",
        proposalId,
        contractId,
        milestoneId,
        paymentIntentId,
        bookingClassification: "DIRECT",
        feeProfileSnapshot: { e2e: true },
        amountRequestedCents: amountCents,
        currency: "USD",
        reason: "E2E release blocker",
        status: "OPEN",
      },
    });
    return NextResponse.json({ blocker });
  }

  if (action === "clear-blockers") {
    const { proposalId, milestoneId } = body;
    await prisma.refundRequest.updateMany({ where: { proposalId, milestoneId, status: "OPEN" }, data: { status: "CANCELED" } });
    await prisma.dispute.updateMany({ where: { proposalId, milestoneId, status: { in: ["OPEN", "NEEDS_INFO", "UNDER_ADMIN_REVIEW", "ESCALATED"] } }, data: { status: "REJECTED", freezeState: "RELEASE_ELIGIBLE" } });
    await prisma.paymentHoldback.updateMany({ where: { proposalId, milestoneId, state: "ACTIVE" }, data: { state: "RELEASED", releasedAt: new Date(), releaseReason: "E2E cleared" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "inspect") {
    return NextResponse.json(await inspectScenario(String(body.proposalId), String(body.milestoneId), body.paymentIntentId ? String(body.paymentIntentId) : undefined, body.payoutId ? String(body.payoutId) : undefined));
  }

  return NextResponse.json({ error: "Unknown E2E action" }, { status: 400 });
}
