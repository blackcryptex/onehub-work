import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canEditListing } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

async function requireEditableSlot(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>, slotId: string) {
  const slot = await db.availabilitySlot.findUniqueOrThrow({
    where: { id: slotId },
    include: { listing: { include: { org: { include: { members: true } } } } },
  });
  if (!canEditListing(user, slot.listing)) throw new Error("Forbidden");
  return slot;
}

export const availabilityRouter = router({
  setSlots: protectedProcedure.input(z.object({ listingId: z.string(), slots: z.array(z.object({ startAt: z.date(), endAt: z.date(), status: z.enum(["AVAILABLE","HOLD","BOOKED","UNAVAILABLE"]).optional() })) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const listing = await db.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, listing)) throw new Error("Forbidden");
    await db.availabilitySlot.deleteMany({ where: { listingId: input.listingId } });
    await db.availabilitySlot.createMany({ data: input.slots.map((s) => ({ listingId: input.listingId, startAt: s.startAt, endAt: s.endAt, status: s.status ?? "AVAILABLE" })) });
    return db.availabilitySlot.findMany({ where: { listingId: input.listingId } });
  }),
  holdSlot: protectedProcedure.input(z.object({ listingId: z.string(), startAt: z.date(), endAt: z.date(), reason: z.string().optional(), bookingRequestId: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const listing = await db.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    if (!canEditListing(ctx.user, listing)) throw new Error("Forbidden");
    const bookingRequest = input.bookingRequestId
      ? await db.bookingRequest.findUniqueOrThrow({ where: { id: input.bookingRequestId }, include: { event: true } })
      : null;
    if (bookingRequest && (bookingRequest.listingId !== input.listingId || bookingRequest.startAt > input.endAt || bookingRequest.endAt < input.startAt)) {
      throw new Error("Booking request does not match this availability hold");
    }
    const slot = await db.availabilitySlot.findFirst({ where: { listingId: input.listingId, startAt: { lte: input.endAt }, endAt: { gte: input.startAt }, status: "AVAILABLE" } });
    if (!slot) throw new Error("No available slot");
    const note = [
      input.reason,
      bookingRequest ? `bookingRequest:${bookingRequest.id}` : null,
      bookingRequest ? `event:${bookingRequest.eventId}` : null,
    ].filter(Boolean).join(" | ") || null;
    const updated = await db.availabilitySlot.update({ where: { id: slot.id }, data: { status: "HOLD", note } });
    if (bookingRequest) {
      await recordActivity({
        orgId: bookingRequest.orgId,
        eventId: bookingRequest.eventId,
        actorId: ctx.user.id,
        action: "AVAILABILITY_HOLD_LINKED",
        target: updated.id,
        meta: { listingId: input.listingId, bookingRequestId: bookingRequest.id, providerOrgId: listing.orgId },
      });
    }
    return updated;
  }),
  releaseSlot: protectedProcedure.input(z.object({ slotId: z.string() })).mutation(async ({ input, ctx }) => {
    await requireEditableSlot(ctx.user, input.slotId);
    return db.availabilitySlot.update({ where: { id: input.slotId }, data: { status: "AVAILABLE", note: null } });
  }),
  markBooked: protectedProcedure.input(z.object({ slotId: z.string() })).mutation(async ({ input, ctx }) => {
    await requireEditableSlot(ctx.user, input.slotId);
    return db.availabilitySlot.update({ where: { id: input.slotId }, data: { status: "BOOKED" } });
  }),
  list: publicProcedure.input(z.object({ listingId: z.string() })).query(({ input }) => db.availabilitySlot.findMany({ where: { listingId: input.listingId }, orderBy: { startAt: "asc" } })),
});

