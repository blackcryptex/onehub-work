import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { AppUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

export const BOOKING_REQUEST_CREATED_ACTION = "BOOKING_REQUEST_CREATED";
export const BOOKING_REQUEST_STATUS_SET_ACTION = "BOOKING_REQUEST_STATUS_SET";
export const PROVIDER_PROPOSAL_SUBMITTED_ACTION = "PROVIDER_PROPOSAL_SUBMITTED";

export const providerBookingStatusValues = [
  "PENDING",
  "HOLD",
  "QUOTED",
  "DECLINED",
  "EXPIRED",
  "WITHDRAWN",
] as const;

export type ProviderBookingStatus = (typeof providerBookingStatusValues)[number];

type WorkflowDb = Pick<
  Prisma.TransactionClient,
  "bookingRequest" | "proposal" | "activity" | "notification" | "organization"
>;

type WorkflowUser = AppUser;

function forbidden(message: string) {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

function unauthorized() {
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
}

export async function recordBookingRequestCreatedEvidence(params: {
  db: WorkflowDb;
  orgId: string;
  eventId: string;
  actorId: string;
  bookingRequestId: string;
  listing: {
    id: string;
    title: string;
    orgId: string;
    org?: { members?: Array<{ userId: string; role: string }> } | null;
  };
  contactName: string;
}) {
  const providerMembers =
    params.listing.org?.members?.filter((member) => member.role === "OWNER" || member.role === "ADMIN") ?? [];

  await recordActivity({
    db: params.db,
    orgId: params.orgId,
    eventId: params.eventId,
    actorId: params.actorId,
    action: BOOKING_REQUEST_CREATED_ACTION,
    target: params.bookingRequestId,
    meta: {
      listingId: params.listing.id,
      providerOrgId: params.listing.orgId,
      evidence: "visible-booking-request-path",
    },
  });

  if (providerMembers.length > 0) {
    await params.db.notification.createMany({
      data: providerMembers.map((member) => ({
        userId: member.userId,
        orgId: params.listing.orgId,
        type: "BOOKING_REQUEST",
        title: `New booking request: ${params.listing.title}`,
        body: `From ${params.contactName}. Open the provider dashboard to hold, decline, or quote this lead.`,
        link: "/vendor/dashboard",
      })),
    });
  }
}

async function getProviderOwnedBookingRequest(params: {
  db: WorkflowDb;
  id: string;
  user: WorkflowUser | null | undefined;
}) {
  if (!params.user) unauthorized();

  const bookingRequest = await params.db.bookingRequest.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      event: true,
      listing: { include: { org: { include: { members: true } } } },
    },
  });

  const membership = bookingRequest.listing.org.members.find((member: { userId: string }) => member.userId === params.user?.id);
  if (!isOrgAdminOrOwner(params.user, bookingRequest.listing.org, membership)) {
    forbidden("Only provider organization owners or admins can respond to this lead");
  }

  return bookingRequest;
}

export async function setProviderBookingRequestStatus(params: {
  db: WorkflowDb;
  id: string;
  status: ProviderBookingStatus;
  user: WorkflowUser | null | undefined;
}) {
  const bookingRequest = await getProviderOwnedBookingRequest(params);

  const updated = await params.db.bookingRequest.update({
    where: { id: params.id },
    data: { status: params.status },
  });

  await recordActivity({
    db: params.db,
    orgId: bookingRequest.orgId,
    eventId: bookingRequest.eventId,
    actorId: params.user?.id,
    action: BOOKING_REQUEST_STATUS_SET_ACTION,
    target: bookingRequest.id,
    meta: {
      status: params.status,
      listingId: bookingRequest.listingId,
      buyerOrgId: bookingRequest.orgId,
      providerOrgId: bookingRequest.listing.orgId,
      evidence: "event-logistics-status-change",
    },
  });

  const buyerOrg = await params.db.organization.findUnique({
    where: { id: bookingRequest.orgId },
    include: { members: true },
  });
  const plannerRecipients = buyerOrg?.members.filter((member) => member.role === "OWNER" || member.role === "ADMIN") ?? [];
  if (plannerRecipients.length > 0) {
    await params.db.notification.createMany({
      data: plannerRecipients.map((member) => ({
        userId: member.userId,
        orgId: bookingRequest.orgId,
        type: "BOOKING_REQUEST_STATUS",
        title: `Provider status changed: ${bookingRequest.listing.title}`,
        body: `${bookingRequest.listing.title} marked this event request ${params.status}. Review the event logistics timeline for the next action.`,
        link: `/pro/planner/vault/${bookingRequest.event.slug}#workspace-requests-detail`,
      })),
      skipDuplicates: true,
    });
  }

  return updated;
}

export async function submitProviderQuoteForBookingRequest(params: {
  db: WorkflowDb;
  id: string;
  quoteCents: number;
  note?: string | null;
  user: WorkflowUser | null | undefined;
}) {
  const bookingRequest = await getProviderOwnedBookingRequest(params);

  const updated = await params.db.bookingRequest.update({
    where: { id: params.id },
    data: { status: "QUOTED", quoteCents: params.quoteCents, notes: params.note || null },
  });

  const proposal = await params.db.proposal.create({
    data: {
      orgId: bookingRequest.orgId,
      eventId: bookingRequest.eventId,
      listingId: bookingRequest.listingId,
      title: `${bookingRequest.listing.title} quote for ${bookingRequest.event.name}`,
      summary: `Provider-submitted quote from ${bookingRequest.listing.title}${params.note ? `: ${params.note}` : "."}`,
      status: "SENT",
      bookingClassification: "MARKETPLACE",
      currency: "USD",
      subtotalCents: params.quoteCents,
      taxCents: 0,
      totalCents: params.quoteCents,
      terms: params.note || undefined,
      lineItems: {
        create: [
          {
            label: `${bookingRequest.listing.title} provider quote`,
            description: params.note || undefined,
            qty: 1,
            unit: "quote",
            unitPriceCents: params.quoteCents,
            totalCents: params.quoteCents,
          },
        ],
      },
      milestones: {
        create: [
          {
            title: "Provider quote total",
            description: "Payment schedule to be finalized during contract generation.",
            dueType: "OFFSET_FROM_EVENT_START",
            dueOffsetDays: -14,
            amountCents: params.quoteCents,
            status: "PENDING",
          },
        ],
      },
    },
  });

  await recordActivity({
    db: params.db,
    orgId: bookingRequest.orgId,
    eventId: bookingRequest.eventId,
    actorId: params.user?.id,
    action: PROVIDER_PROPOSAL_SUBMITTED_ACTION,
    target: proposal.id,
    meta: {
      bookingRequestId: bookingRequest.id,
      listingId: bookingRequest.listingId,
      providerOrgId: bookingRequest.listing.orgId,
      quoteCents: params.quoteCents,
      evidence: "event-logistics-provider-quote",
    },
  });

  const buyerOrg = await params.db.organization.findUnique({
    where: { id: bookingRequest.orgId },
    include: { members: true },
  });
  const plannerRecipients = buyerOrg?.members.filter((member) => member.role === "OWNER" || member.role === "ADMIN") ?? [];
  if (plannerRecipients.length > 0) {
    await params.db.notification.createMany({
      data: plannerRecipients.map((member) => ({
        userId: member.userId,
        orgId: bookingRequest.orgId,
        type: "PROVIDER_PROPOSAL_SUBMITTED",
        title: `Provider quote received: ${bookingRequest.listing.title}`,
        body: `${bookingRequest.listing.title} submitted a quote for ${bookingRequest.event.name}. Review the logistics next action before advancing contract or payment steps.`,
        link: `/pro/planner/vault/${bookingRequest.event.slug}#workspace-proposals-detail`,
      })),
      skipDuplicates: true,
    });
  }

  return { bookingRequest: updated, proposal };
}
