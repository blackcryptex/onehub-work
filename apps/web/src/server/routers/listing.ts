import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, canEditListing } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

const createSchema = z.object({
  orgSlug: z.string(),
  type: z.enum(["VENDOR", "VENUE"]),
  category: z.enum(["VENUE_SPACE","CATERING","DECOR_FLORAL","ENTERTAINMENT","PHOTO_VIDEO","TRANSPORT","STAFFING","PLANNING_SERVICES","RENTALS","OTHER"]),
  title: z.string().min(2),
  description: z.string().optional(),
  location: z.object({ street: z.string().optional(), city: z.string().optional(), state: z.string().optional(), country: z.string().optional(), postalCode: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional() }).optional(),
  capacity: z.object({ min: z.number().int().optional(), max: z.number().int().optional() }).optional(),
  priceTier: z.number().int().min(1).max(5).optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const listingRouter = router({
  create: publicProcedure.input(createSchema).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug }, include: { members: true } });
    if (!org) throw new Error("Org not found");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    const mem = org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, org, mem)) throw new Error("Forbidden");
    const slugBase = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const listing = await prisma.listing.create({
      data: {
        orgId: org.id,
        slug,
        title: input.title,
        type: input.type,
        category: input.category,
        description: input.description,
        street: input.location?.street,
        city: input.location?.city,
        state: input.location?.state,
        country: input.location?.country ?? "US",
        postalCode: input.location?.postalCode,
        latitude: input.location?.latitude,
        longitude: input.location?.longitude,
        minGuests: input.capacity?.min,
        maxGuests: input.capacity?.max,
        priceTier: input.priceTier,
        website: input.website,
        phone: input.phone,
        email: input.email,
      },
    });
    await recordActivity({ orgId: org.id, actorId: user.id, action: "LISTING_CREATED", target: listing.id });
    return listing;
  }),
  update: publicProcedure.input(z.object({ listingId: z.string(), data: z.object({ title: z.string().optional(), description: z.string().optional(), category: z.enum(["VENUE_SPACE","CATERING","DECOR_FLORAL","ENTERTAINMENT","PHOTO_VIDEO","TRANSPORT","STAFFING","PLANNING_SERVICES","RENTALS","OTHER"]).optional(), priceTier: z.number().int().min(1).max(5).optional() }).partial() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, listing)) throw new Error("Forbidden");
    const updated = await prisma.listing.update({ where: { id: input.listingId }, data: input.data });
    await recordActivity({ orgId: listing.orgId, actorId: user.id, action: "LISTING_UPDATED", target: listing.id });
    return updated;
  }),
  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => prisma.listing.findUnique({ where: { slug: input.slug }, include: { tags: true, gallery: true, offers: true, reviews: { include: { author: true } } } })),
  listByOrg: publicProcedure.input(z.object({ orgSlug: z.string() })).query(async ({ input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return [];
    return prisma.listing.findMany({ where: { orgId: org.id }, include: { tags: true, gallery: { take: 1 } } });
  }),
  addTag: publicProcedure.input(z.object({ listingId: z.string(), value: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, listing)) throw new Error("Forbidden");
    return prisma.listingTag.create({ data: { listingId: input.listingId, value: input.value } });
  }),
  removeTag: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const tag = await prisma.listingTag.findUniqueOrThrow({ where: { id: input.id }, include: { listing: { include: { org: { include: { members: true } } } } } });
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, tag.listing)) throw new Error("Forbidden");
    await prisma.listingTag.delete({ where: { id: input.id } });
    return true;
  }),
  addMedia: publicProcedure.input(z.object({ listingId: z.string(), url: z.string().url(), caption: z.string().optional() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId }, include: { org: { include: { members: true } } } });
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, listing)) throw new Error("Forbidden");
    return prisma.media.create({ data: { listingId: input.listingId, url: input.url, caption: input.caption } });
  }),
  removeMedia: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const media = await prisma.media.findUniqueOrThrow({ where: { id: input.id }, include: { listing: { include: { org: { include: { members: true } } } } } });
    if (!media.listing) throw new Error("Not a listing media");
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: vendors/venues can edit their own listings: see apps/web/src/lib/rbac.ts
    if (!canEditListing(user, media.listing)) throw new Error("Forbidden");
    await prisma.media.delete({ where: { id: input.id } });
    return true;
  }),
});

