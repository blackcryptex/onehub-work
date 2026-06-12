import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/server/db";
import {
  buildBookingResponseUpdate,
  buildProviderProposalFromBookingRequest,
  buildProviderResponseTransitionPlan,
  buildTransactionAuditEntry,
  canProviderRespondToBookingRequest,
} from "@/lib/transaction-loop";
import { recordActivity } from "@/server/lib/activity";
import { notify } from "@/server/routers/notification";

const responseSchema = z.object({
  bookingRequestId: z.string().min(1),
  action: z.enum(["HOLD", "DECLINED", "QUOTED"]),
  quoteDollars: z.union([z.string(), z.number()]).optional(),
  note: z.string().optional(),
  createProposal: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = responseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid booking response" }, { status: 400 });
    }

    const input = parsed.data;
    const bookingRequest = await db.bookingRequest.findUnique({
      where: { id: input.bookingRequestId },
      include: {
        event: {
          include: {
            org: {
              include: {
                members: {
                  where: { role: { in: ["OWNER", "ADMIN"] } },
                  select: { userId: true, role: true },
                },
              },
            },
          },
        },
        listing: {
          include: {
            org: {
              include: {
                members: {
                  select: { userId: true, role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!bookingRequest) {
      return NextResponse.json({ error: "Booking request not found" }, { status: 404 });
    }

    const allowed = canProviderRespondToBookingRequest({
      userId: user.id,
      listingOrgOwnerId: bookingRequest.listing.org.ownerId,
      listingOrgMembers: bookingRequest.listing.org.members,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = buildBookingResponseUpdate({
      action: input.action,
      quoteDollars: input.quoteDollars,
      note: input.note,
    });
    const transitionPlan = buildProviderResponseTransitionPlan({
      currentStatus: bookingRequest.status,
      action: input.action,
    });

    const updatedRequest = await db.bookingRequest.update({
      where: { id: bookingRequest.id },
      data: update,
    });

    for (const transition of transitionPlan) {
      const audit = buildTransactionAuditEntry({
        bookingRequestId: bookingRequest.id,
        actorId: user.id,
        actorRole: "PROVIDER",
        fromState: transition.fromState,
        toState: transition.toState,
        reason: transition.reason,
      });
      await recordActivity({
        orgId: bookingRequest.event.orgId,
        eventId: bookingRequest.eventId,
        actorId: user.id,
        action: audit.action,
        target: audit.target,
        meta: audit.meta,
      });
    }

    await recordActivity({
      orgId: bookingRequest.listing.orgId,
      eventId: bookingRequest.eventId,
      actorId: user.id,
      action: "BOOKING_REQUEST_PROVIDER_RESPONDED",
      target: bookingRequest.id,
      meta: { status: update.status, quoteCents: "quoteCents" in update ? update.quoteCents : null },
    });

    let proposal = null;
    const quoteCents = "quoteCents" in update ? update.quoteCents : null;
    if (input.action === "QUOTED" && input.createProposal && quoteCents) {
      const existingProposal = await db.proposal.findFirst({
        where: {
          eventId: bookingRequest.eventId,
          listingId: bookingRequest.listingId,
          summary: { contains: `Response to booking request ${bookingRequest.id}` },
        },
        select: { id: true },
      });

      if (existingProposal) {
        proposal = existingProposal;
      } else {
        proposal = await db.proposal.create({
          data: buildProviderProposalFromBookingRequest({
            bookingRequestId: bookingRequest.id,
            eventId: bookingRequest.eventId,
            plannerOrgId: bookingRequest.event.orgId,
            listingId: bookingRequest.listingId,
            listingTitle: bookingRequest.listing.title,
            providerOrgName: bookingRequest.listing.org.name,
            quoteCents,
            note: input.note,
            startAt: bookingRequest.startAt,
            endAt: bookingRequest.endAt,
          }),
          select: { id: true },
        });

        await recordActivity({
          orgId: bookingRequest.event.orgId,
          eventId: bookingRequest.eventId,
          actorId: user.id,
          action: "PROVIDER_PROPOSAL_CREATED_FROM_BOOKING_REQUEST",
          target: proposal.id,
          meta: { bookingRequestId: bookingRequest.id, listingId: bookingRequest.listingId },
        });
      }
    }

    for (const member of bookingRequest.event.org.members) {
      await notify(member.userId, {
        orgId: bookingRequest.event.orgId,
        type: "BOOKING_REQUEST_RESPONSE",
        title: `Booking request ${updatedRequest.status.toLowerCase()}: ${bookingRequest.listing.title}`,
        body: proposal ? "Provider sent a proposal response." : input.note,
        link: proposal ? `/proposals/${proposal.id}` : "/app/requests",
      });
    }

    return NextResponse.json({
      success: true,
      bookingRequest: updatedRequest,
      proposalId: proposal?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to respond to booking request";
    const status = message.includes("quote amount is required") || message.includes("invalid booking transition") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
