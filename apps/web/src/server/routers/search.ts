import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import type { Prisma } from "@prisma/client";

export const searchRouter = router({
  searchListings: publicProcedure.input(z.object({
    q: z.string().optional(),
    type: z.enum(["VENDOR", "VENUE"]).optional(),
    categories: z.array(z.enum(["VENUE_SPACE","CATERING","DECOR_FLORAL","ENTERTAINMENT","PHOTO_VIDEO","TRANSPORT","STAFFING","PLANNING_SERVICES","RENTALS","OTHER"])).optional(),
    priceTierMin: z.number().int().min(1).max(5).optional(),
    priceTierMax: z.number().int().min(1).max(5).optional(),
    capacityMin: z.number().int().optional(),
    capacityMax: z.number().int().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    ratingMin: z.number().min(0).max(5).optional(),
    tags: z.array(z.string()).optional(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(100).default(20),
  })).query(async ({ input }) => {
    const where: Prisma.ListingWhereInput = {};
    if (input.type) where.type = input.type;
    if (input.categories && input.categories.length > 0) where.category = { in: input.categories };
    if (input.priceTierMin !== undefined || input.priceTierMax !== undefined) {
      where.priceTier = {
        ...(typeof input.priceTierMin === "number" ? { gte: input.priceTierMin } : {}),
        ...(typeof input.priceTierMax === "number" ? { lte: input.priceTierMax } : {}),
      };
    }
    if (typeof input.capacityMin === "number") where.maxGuests = { gte: input.capacityMin };
    if (typeof input.capacityMax === "number") where.minGuests = { lte: input.capacityMax };
    if (input.city) where.city = { contains: input.city, mode: "insensitive" };
    if (input.state) where.state = input.state;
    if (input.country) where.country = input.country;
    if (typeof input.ratingMin === "number") where.ratingAvg = { gte: input.ratingMin };
    if (input.tags && input.tags.length > 0) where.tags = { some: { value: { in: input.tags } } };
    if (input.q) {
      where.OR = [
        { title: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
        { city: { contains: input.q, mode: "insensitive" } },
        { state: { contains: input.q, mode: "insensitive" } },
      ];
    }
    const items = await db.listing.findMany({
      where,
      include: { tags: true, gallery: { take: 1 } },
      take: input.limit + 1,
      orderBy: { createdAt: "desc" },
      cursor: input.cursor ? { id: input.cursor } : undefined,
    });
    let nextCursor: string | undefined;
    if (items.length > input.limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }
    return { items, nextCursor };
  }),
  similarListings: publicProcedure.input(z.object({ listingId: z.string() })).query(async ({ input }) => {
    const listing = await db.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { tags: true } });
    const tagValues = listing.tags.map((t) => t.value);
    return db.listing.findMany({
      where: { id: { not: input.listingId }, category: listing.category, OR: tagValues.length > 0 ? [{ tags: { some: { value: { in: tagValues } } } }, { city: listing.city }] : [{ city: listing.city }] },
      take: 6,
      include: { tags: true, gallery: { take: 1 } },
    });
  }),
});

