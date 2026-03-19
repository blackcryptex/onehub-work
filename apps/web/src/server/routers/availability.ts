import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, canEditListing } from "@/lib/rbac";

export const availabilityRouter = router({
  setSlots: publicProcedure.input(z.object({ listingId: z.string(), slots: z.array(z.object({ startAt: z.date(), endAt: z.date(), status: z.enum(["AVAILABLE","HOLD","BOOKED","UNAVAILABLE"]).optional() })) })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, listing)) throw new Error("Forbidden");
    await prisma.availabilitySlot.deleteMany({ where: { listingId: input.listingId } });
    await prisma.availabilitySlot.createMany({ data: input.slots.map((s) => ({ listingId: input.listingId, startAt: s.startAt, endAt: s.endAt, status: s.status ?? "AVAILABLE" })) });
    return prisma.availabilitySlot.findMany({ where: { listingId: input.listingId } });
  }),
  holdSlot: publicProcedure.input(z.object({ listingId: z.string(), startAt: z.date(), endAt: z.date(), reason: z.string().optional() })).mutation(async ({ input }) => {
    const slot = await prisma.availabilitySlot.findFirst({ where: { listingId: input.listingId, startAt: { lte: input.endAt }, endAt: { gte: input.startAt }, status: "AVAILABLE" } });
    if (!slot) throw new Error("No available slot");
    return prisma.availabilitySlot.update({ where: { id: slot.id }, data: { status: "HOLD", note: input.reason } });
  }),
  // SECURITY HOTFIX: require auth (P0)
  releaseSlot: protectedProcedure.input(z.object({ slotId: z.string() })).mutation(({ input }) => prisma.availabilitySlot.update({ where: { id: input.slotId }, data: { status: "AVAILABLE", note: null } })),
  // SECURITY HOTFIX: require auth (P0)
  markBooked: protectedProcedure.input(z.object({ slotId: z.string() })).mutation(({ input }) => prisma.availabilitySlot.update({ where: { id: input.slotId }, data: { status: "BOOKED" } })),
  list: publicProcedure.input(z.object({ listingId: z.string() })).query(({ input }) => prisma.availabilitySlot.findMany({ where: { listingId: input.listingId }, orderBy: { startAt: "asc" } })),
});

