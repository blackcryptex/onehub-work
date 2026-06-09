import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isOrgAdminOrOwner, isAdmin } from "@/lib/rbac";
import { recordActivity } from "@/server/lib/activity";

export const reviewRouter = router({
  create: publicProcedure.input(z.object({ listingId: z.string(), rating: z.number().int().min(1).max(5), title: z.string().optional(), body: z.string().optional() })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const listing = await db.listing.findUniqueOrThrow({ where: { id: input.listingId } });
    const review = await db.review.create({ data: { authorId: userId, listingId: input.listingId, rating: input.rating, title: input.title, body: input.body } });
    const avgResult = await db.review.aggregate({ where: { listingId: input.listingId }, _avg: { rating: true }, _count: true });
    await db.listing.update({ where: { id: input.listingId }, data: { ratingAvg: avgResult._avg.rating ?? 0, ratingCount: avgResult._count } });
    await recordActivity({ orgId: listing.orgId, actorId: userId, action: "REVIEW_CREATED", target: review.id });
    return review;
  }),
  list: publicProcedure.input(z.object({ listingId: z.string(), cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) })).query(async ({ input }) => {
    const items = await db.review.findMany({ where: { listingId: input.listingId, flagged: false }, include: { author: true }, take: input.limit + 1, orderBy: { createdAt: "desc" }, cursor: input.cursor ? { id: input.cursor } : undefined });
    let nextCursor: string | undefined;
    if (items.length > input.limit) {
      const next = items.pop();
      nextCursor = next?.id;
    }
    return { items, nextCursor };
  }),
  flag: publicProcedure.input(z.object({ id: z.string(), reason: z.string().optional() })).mutation(async ({ input }) => {
    const review = await db.review.findUniqueOrThrow({ where: { id: input.id }, include: { listing: { include: { org: { include: { members: true } } } } } });
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    // Centralized permission check: see apps/web/src/lib/rbac.ts
    // Only org admin/owner AND global admin can flag reviews
    const mem = review.listing.org.members.find((m) => m.userId === user.id);
    if (!isOrgAdminOrOwner(user, review.listing.org, mem) || !isAdmin(user)) throw new Error("Forbidden");
    return db.review.update({ where: { id: input.id }, data: { flagged: true } });
  }),
});

