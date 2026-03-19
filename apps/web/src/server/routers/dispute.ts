import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { recordActivity } from "@/server/lib/activity";

export const disputeRouter = router({
  create: publicProcedure.input(z.object({
    proposalId: z.string(),
    milestoneId: z.string().optional(),
    title: z.string(),
    body: z.string().optional(),
  })).mutation(async ({ input }) => {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;
    if (!userId) throw new Error("Unauthorized");
    const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id: input.proposalId }, include: { event: true } });
    const mem = await prisma.membership.findFirst({ where: { userId, orgId: proposal.event.orgId } });
    if (!mem) throw new Error("Forbidden");
    const dispute = await prisma.dispute.create({
      data: {
        orgId: proposal.event.orgId,
        eventId: proposal.eventId,
        proposalId: input.proposalId,
        milestoneId: input.milestoneId,
        title: input.title,
        body: input.body,
      },
    });
    await recordActivity({ orgId: proposal.orgId, eventId: proposal.eventId, actorId: userId, action: "DISPUTE_OPENED", target: dispute.id });
    return dispute;
  }),
  list: publicProcedure.input(z.object({ orgSlug: z.string(), status: z.enum(["OPEN", "NEEDS_INFO", "ESCALATED", "RESOLVED", "REJECTED"]).optional() })).query(async ({ input }) => {
    const org = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
    if (!org) return [];
    return prisma.dispute.findMany({ where: { orgId: org.id, ...(input.status ? { status: input.status } : {}) }, include: { proposal: true } });
  }),
  updateStatus: publicProcedure.input(z.object({
    id: z.string(),
    status: z.enum(["OPEN", "NEEDS_INFO", "ESCALATED", "RESOLVED", "REJECTED"]),
    resolution: z.string().optional(),
  })).mutation(async ({ input }) => {
    const dispute = await prisma.dispute.update({
      where: { id: input.id },
      data: { status: input.status, resolution: input.resolution },
    });
    await recordActivity({ orgId: dispute.orgId, eventId: dispute.eventId ?? undefined, actorId: undefined, action: "DISPUTE_RESOLVED", target: dispute.id });
    return dispute;
  }),
});

