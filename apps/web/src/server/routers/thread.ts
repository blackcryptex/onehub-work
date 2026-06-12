import { z } from "zod";
import { db } from "@/server/db";
import { router, protectedProcedure } from "@/server/trpc";
import {
  canAccessThread,
  getUserOrgIds,
  requireEventAccess,
  requireOrgMembership,
  requireThreadAccess,
  forbidden,
  notFound,
} from "@/server/lib/access";

export const threadRouter = router({
  create: protectedProcedure.input(z.object({
    orgId: z.string(),
    eventId: z.string().optional(),
    proposalId: z.string().optional(),
    listingId: z.string().optional(),
    subject: z.string(),
    participants: z.array(z.object({ email: z.string().email(), userId: z.string().optional(), roleHint: z.string().optional() })),
  })).mutation(async ({ input, ctx }) => {
    // Caller must belong to the org the thread is created under.
    await requireOrgMembership(ctx.user, input.orgId);
    if (input.eventId) {
      const event = await requireEventAccess(ctx.user, input.eventId);
      if (event.orgId !== input.orgId) throw forbidden("Event not in org");
    }
    if (input.proposalId) {
      const proposal = await db.proposal.findUnique({
        where: { id: input.proposalId },
        select: { event: { select: { orgId: true } } },
      });
      if (!proposal) throw notFound("Proposal not found");
      if (proposal.event.orgId !== input.orgId) throw forbidden("Proposal not in org");
    }
    if (input.listingId) {
      const listing = await db.listing.findUnique({ where: { id: input.listingId }, select: { id: true } });
      if (!listing) throw notFound("Listing not found");
    }
    return db.thread.create({
      data: {
        orgId: input.orgId,
        eventId: input.eventId,
        proposalId: input.proposalId,
        listingId: input.listingId,
        subject: input.subject,
        participants: { create: input.participants },
      },
    });
  }),
  listByContext: protectedProcedure.input(z.object({
    eventId: z.string().optional(),
    proposalId: z.string().optional(),
    listingId: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const threads = await db.thread.findMany({
      where: input,
      include: {
        participants: true,
        listing: { select: { orgId: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    // Filter to threads the caller may access (participant, org member, listing org member, admin).
    const orgIds = await getUserOrgIds(ctx.user);
    return threads.filter((t) => canAccessThread(ctx.user, t, orgIds));
  }),
  get: protectedProcedure.input(z.object({ threadId: z.string() })).query(async ({ input, ctx }) => {
    await requireThreadAccess(ctx.user, input.threadId);
    return db.thread.findUnique({ where: { id: input.threadId }, include: { participants: true, messages: { include: { thread: true } } } });
  }),
});
