import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

export const shortlistRouter = router({
  // List all shortlist items for an event
  list: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const event = await db.event.findUnique({
        where: { id: input.eventId },
        include: {
          org: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!event) throw new Error("Event not found");
      if (!canManageEvent(user, event)) throw new Error("Forbidden");

      return db.shortlistItem.findMany({
        where: { eventId: input.eventId },
        include: {
          listing: {
            include: {
              org: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }) as UnsafeAny; // TODO: Remove 'as UnsafeAny' after Prisma client regeneration
    }),

  // Add a listing to the shortlist
  add: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        listingId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const event = await db.event.findUnique({
        where: { id: input.eventId },
        include: {
          org: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!event) throw new Error("Event not found");
      if (!canManageEvent(user, event)) throw new Error("Forbidden");

      const listing = await db.listing.findUnique({
        where: { id: input.listingId },
      });

      if (!listing) throw new Error("Listing not found");

      // Check if already shortlisted
      const existing = await db.shortlistItem.findFirst({
        where: {
          eventId: input.eventId,
          listingId: input.listingId,
        },
      });

      if (existing) {
        // Update notes if provided
        if (input.notes !== undefined) {
          return db.shortlistItem.update({
            where: { id: existing.id },
            data: { notes: input.notes } as UnsafeAny, // TODO: Remove 'as UnsafeAny' after Prisma client regeneration
          });
        }
        return existing;
      }

      const shortlistItem = await db.shortlistItem.create({
        data: {
          eventId: input.eventId,
          listingId: input.listingId,
          notes: input.notes,
        } as UnsafeAny, // TODO: Remove 'as UnsafeAny' after Prisma client regeneration
        include: {
          listing: {
            include: {
              org: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }) as UnsafeAny; // TODO: Remove 'as UnsafeAny' after Prisma client regeneration

      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: user.id,
        action: "SHORTLIST_ADDED",
        target: listing.id,
      });

      return shortlistItem;
    }),

  // Remove a listing from the shortlist
  remove: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        listingId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Unauthorized");

      const event = await db.event.findUnique({
        where: { id: input.eventId },
        include: {
          org: {
            include: {
              members: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!event) throw new Error("Event not found");
      if (!canManageEvent(user, event)) throw new Error("Forbidden");

      const shortlistItem = await db.shortlistItem.findFirst({
        where: {
          eventId: input.eventId,
          listingId: input.listingId,
        },
      });

      if (!shortlistItem) throw new Error("Shortlist item not found");

      await db.shortlistItem.delete({
        where: { id: shortlistItem.id },
      });

      await recordActivity({
        orgId: event.orgId,
        eventId: event.id,
        actorId: user.id,
        action: "SHORTLIST_REMOVED",
        target: input.listingId,
      });

      return { success: true };
    }),

  // Check if a listing is shortlisted
  isShortlisted: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        listingId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const shortlistItem = await db.shortlistItem.findFirst({
        where: {
          eventId: input.eventId,
          listingId: input.listingId,
        },
      });

      return !!shortlistItem;
    }),
});

