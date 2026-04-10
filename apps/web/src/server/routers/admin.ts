import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure } from "@/server/trpc";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canAccessDashboard } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";
import {
  canAdminOverrideBookingClassification,
  getBookingClassificationHooks,
  resolveBookingClassification,
} from "@/lib/booking-classification";
import { reviewRefundRequest } from "@/lib/refund-request";

// Centralized permission check: see apps/web/src/lib/rbac.ts
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN")) {
    throw new Error("Forbidden: Admin access required");
  }
  // When impersonating, check the real admin user, not the impersonated user
  const session = await auth();
  const realUserId = session?.user?.realUserId || session?.user?.id;
  if (!realUserId) {
    throw new Error("Forbidden: Admin access required");
  }
  // Verify the real user (not impersonated) is an admin
  const realUser = await prisma.user.findUnique({ where: { id: realUserId } });
  if (!realUser || realUser.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return realUserId;
}

export const adminRouter = router({
  metrics: router({
    daily: publicProcedure.input(z.object({
      from: z.date(),
      to: z.date(),
    })).query(async ({ input }) => {
      await requireAdmin();
      return prisma.metricDaily.findMany({
        where: { date: { gte: input.from, lte: input.to } },
        orderBy: { date: "asc" },
      });
    }),
  }),

  abuse: router({
    report: publicProcedure.input(z.object({
      targetType: z.string(),
      targetId: z.string(),
      reason: z.string().min(1),
    })).mutation(async ({ input }) => {
      const session = await auth();
      const userId = session?.user?.id as string | undefined;
      return prisma.abuseReport.create({
        data: {
          reporterId: userId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          status: "OPEN",
        },
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.string(),
      status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      await requireAdmin();
      const { id, ...data } = input;
      return prisma.abuseReport.update({ where: { id }, data });
    }),
    list: publicProcedure.input(z.object({
      status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })).query(async ({ input }) => {
      await requireAdmin();
      const limit = input.limit ?? 20;
      const where: Prisma.AbuseReportWhereInput = {};
      if (input.status) where.status = input.status;
      const reports = await prisma.abuseReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });
      let nextCursor: string | undefined = undefined;
      if (reports.length > limit) {
        const next = reports.pop();
        nextCursor = next?.id;
      }
      return { items: reports, nextCursor };
    }),
  }),

  bookingClassification: router({
    getProposalContext: publicProcedure.input(z.object({
      proposalId: z.string(),
    })).query(async ({ input }) => {
      await requireAdmin();
      const proposal = await prisma.proposal.findUnique({
        where: { id: input.proposalId },
        include: {
          event: true,
          contract: true,
        },
      });
      if (!proposal) {
        throw new Error("Proposal not found");
      }
      const bookingClassification = resolveBookingClassification({
        proposal: {
          bookingClassification: proposal.bookingClassification,
          listingId: proposal.listingId,
        },
        event: proposal.event,
      });
      return {
        proposalId: proposal.id,
        bookingClassification,
        hooks: getBookingClassificationHooks(bookingClassification),
        adminCanOverride: canAdminOverrideBookingClassification(bookingClassification),
        contractId: proposal.contract?.id ?? null,
      };
    }),
  }),

  refundRequests: router({
    list: publicProcedure.input(z.object({
      status: z.enum(["OPEN", "APPROVED", "DENIED", "CANCELED"]).optional(),
    }).optional()).query(async ({ input }) => {
      await requireAdmin();
      return (prisma as any).refundRequest.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
    }),
    review: publicProcedure.input(z.object({
      refundRequestId: z.string(),
      decision: z.enum(["APPROVED", "DENIED"]),
      decisionReason: z.string().min(3),
      processingFeeTreatment: z.enum(["BUYER_ABSORBS", "REFUND_TO_BUYER", "NON_REFUNDABLE"]).optional(),
      platformFeeTreatment: z.enum(["BUYER_ABSORBS", "REFUND_TO_BUYER", "NON_REFUNDABLE"]).optional(),
    })).mutation(async ({ input }) => {
      const adminId = await requireAdmin();
      return reviewRefundRequest({
        refundRequestId: input.refundRequestId,
        adminId,
        decision: input.decision,
        decisionReason: input.decisionReason,
        processingFeeTreatment: input.processingFeeTreatment,
        platformFeeTreatment: input.platformFeeTreatment,
      });
    }),
    getVerification: publicProcedure.input(z.object({
      refundRequestId: z.string(),
    })).query(async ({ input }) => {
      await requireAdmin();
      return (prisma as any).refundRequest.findUnique({
        where: { id: input.refundRequestId },
      });
    }),
  }),

  users: router({
    list: publicProcedure.input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      q: z.string().optional(), // Search query
    })).query(async ({ input }) => {
      await requireAdmin();
      const limit = input.limit ?? 20;
      const where: Prisma.UserWhereInput = {};
      if (input.q) {
        where.OR = [
          { email: { contains: input.q, mode: "insensitive" } },
          { name: { contains: input.q, mode: "insensitive" } },
        ];
      }
      const users = await prisma.user.findMany({
        where,
        take: limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      let nextCursor: string | undefined = undefined;
      if (users.length > limit) {
        const next = users.pop();
        nextCursor = next?.id;
      }
      return { items: users, nextCursor };
    }),
  }),

  impersonation: router({
    start: publicProcedure.input(z.object({
      targetUserId: z.string(),
    })).mutation(async ({ input }) => {
      // Require admin access (check real admin, not impersonated user)
      const adminId = await requireAdmin();
      
      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: input.targetUserId },
        select: { id: true, email: true, role: true },
      });
      
      if (!targetUser) {
        throw new Error("Target user not found");
      }
      
      // Prevent impersonating yourself
      if (targetUser.id === adminId) {
        throw new Error("Cannot impersonate yourself");
      }
      
      // Return success - actual session update happens via API route
      // The API route will update the JWT token with actingUserId
      return {
        success: true,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
        },
      };
    }),
    
    stop: publicProcedure.mutation(async () => {
      // Require admin access (check real admin, not impersonated user)
      await requireAdmin();
      
      // Return success - actual session update happens via API route
      // The API route will clear actingUserId from the JWT token
      return { success: true };
    }),
  }),
});
