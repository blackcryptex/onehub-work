import { z } from "zod";
import { db } from "@/server/db";
import { router, publicProcedure } from "@/server/trpc";

export const threadRouter = router({
  create: publicProcedure.input(z.object({
    orgId: z.string(),
    eventId: z.string().optional(),
    proposalId: z.string().optional(),
    listingId: z.string().optional(),
    subject: z.string(),
    participants: z.array(z.object({ email: z.string().email(), userId: z.string().optional(), roleHint: z.string().optional() })),
  })).mutation(({ input }) =>
    db.thread.create({
      data: {
        orgId: input.orgId,
        eventId: input.eventId,
        proposalId: input.proposalId,
        listingId: input.listingId,
        subject: input.subject,
        participants: { create: input.participants },
      },
    })
  ),
  listByContext: publicProcedure.input(z.object({
    eventId: z.string().optional(),
    proposalId: z.string().optional(),
    listingId: z.string().optional(),
  })).query(({ input }) => db.thread.findMany({ where: input, include: { participants: true, messages: { take: 1, orderBy: { createdAt: "desc" } } } })),
  get: publicProcedure.input(z.object({ threadId: z.string() })).query(({ input }) =>
    db.thread.findUnique({ where: { id: input.threadId }, include: { participants: true, messages: { include: { thread: true } } } })
  ),
});

