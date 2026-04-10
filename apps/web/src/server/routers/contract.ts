import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { resolveContractTemplate } from "@/server/lib/contracts";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canViewEvent, canManageEvent, isAdmin } from "@/lib/rbac";
import type { AppUser } from "@/lib/auth-helpers";

/**
 * SECURITY: Authorization helper for contract access.
 * Determines if user can access a contract based on:
 * - ADMIN role (full access)
 * - Event view permissions (via canViewEvent - handles org members, planners, stakeholders)
 * - Contract signer status (email match)
 */
async function assertCanAccessContract({
  user,
  contractId,
}: {
  user: AppUser;
  contractId: string;
}): Promise<void> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      signatures: true,
      proposal: {
        include: {
          event: {
            include: {
              org: {
                include: { members: true },
              },
              // Phase 1: Include stakeholders for event-scoped client access
              stakeholders: {
                select: { userId: true, role: true },
              },
              // Phase 2: Include shares for sharing/forwarding
              shares: {
                select: { viewerUserId: true, scope: true },
              },
            },
          },
        },
      },
    },
  });

  if (!contract) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contract not found",
    });
  }

  // ADMIN has full access
  if (isAdmin(user)) {
    return;
  }

  // Check if user can view the event (handles org members, planners, stakeholders with shares)
  const canView = canViewEvent(user, contract.proposal.event);
  if (canView) {
    return;
  }

  // Check if user is a contract signer (email match)
  const isSigner = contract.signatures.some((s) => s.signerEmail === user.email);
  if (isSigner) {
    return;
  }

  // No access granted
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this contract",
  });
}

export const contractRouter = router({
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check via assertCanAccessContract helper
  get: protectedProcedure.input(z.object({ contractId: z.string() })).query(async ({ input, ctx }) => {
    await assertCanAccessContract({ user: ctx.user, contractId: input.contractId });
    
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
      include: {
        signatures: true,
        changeOrders: true,
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    
    // Contract existence already checked in assertCanAccessContract, but TypeScript needs this
    if (!contract) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Contract not found",
      });
    }
    
    return contract;
  }),
  // SECURITY HOTFIX: require auth (P0)
  // SECURITY: permission check via assertCanAccessContract helper
  render: protectedProcedure.input(z.object({ contractId: z.string() })).query(async ({ input, ctx }) => {
    await assertCanAccessContract({ user: ctx.user, contractId: input.contractId });
    
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: input.contractId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
        signatures: true,
      },
    });
    
    // Simple template resolution (actual template would be read from file)
    const template = "Contract for {{EVENT_NAME}}";
    return resolveContractTemplate(template, { EVENT_NAME: contract.proposal.event.name });
  }),
  // SECURITY: permission check - user must be able to manage the event
  sendForSignature: publicProcedure.input(z.object({
    contractId: z.string(),
    signers: z.array(z.object({ name: z.string(), email: z.string().email() })),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: input.contractId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    if (!canManageEvent(user, contract.proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to send this contract for signature",
      });
    }
    
    await prisma.signature.createMany({
      data: input.signers.map((s) => ({
        contractId: input.contractId,
        signerName: s.name,
        signerEmail: s.email,
      })),
    });
    await prisma.contract.update({ where: { id: input.contractId }, data: { status: "OUT_FOR_SIGNATURE" } });
    
    // Audit: Log that this contract was sent for signature by this user
    await recordActivity({
      orgId: contract.orgId,
      eventId: contract.eventId,
      actorId: user?.id ?? undefined,
      action: ACTIVITY_ACTIONS.CONTRACT_SENT_FOR_SIGNATURE,
      target: contract.id,
      meta: { recipients: input.signers.map((s) => s.email) },
    });
    
    // TODO: Send emails (stub log for now)
    return { success: true };
  }),
  // SECURITY: permission check - user must be the signer (email matches) OR be able to manage the event
  sign: publicProcedure.input(z.object({
    signatureId: z.string(),
    typedName: z.string(),
    ip: z.string().optional(),
    ua: z.string().optional(),
    imageUrl: z.string().optional(),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const signature = await prisma.signature.findUniqueOrThrow({
      where: { id: input.signatureId },
      include: {
        contract: {
          include: {
            signatures: true,
            proposal: {
              include: {
                event: {
                  include: {
                    org: {
                      include: { members: true },
                    },
                  },
                },
                listing: {
                  include: {
                    org: {
                      include: { members: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    // Check if user is the signer OR can manage the event
    const isSigner = signature.signerEmail === user.email;
    const canManage = canManageEvent(user, signature.contract.proposal.event);
    if (!isSigner && !canManage) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to sign this contract",
      });
    }
    const contract = signature.contract;
    const previousStatus = contract.status;
    
    const updatedSignature = await prisma.signature.update({
      where: { id: input.signatureId },
      data: {
        signedAt: new Date(),
        signerName: input.typedName,
        ip: input.ip,
        ua: input.ua,
        imageUrl: input.imageUrl,
        method: input.imageUrl ? "drawn" : "typed",
        signerId: user.id,
      },
    });
    
    // Reload contract with all signatures to check true dual-party execution
    const contractWithSignatures = await prisma.contract.findUniqueOrThrow({
      where: { id: contract.id },
      include: {
        signatures: true,
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
            listing: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    const buyerMemberIds = new Set(
      contractWithSignatures.proposal.event.org.members.map((member) => member.userId)
    );
    const sellerMemberIds = new Set(
      (contractWithSignatures.proposal.listing?.org.members ?? []).map((member) => member.userId)
    );
    const buyerSigned = contractWithSignatures.signatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && buyerMemberIds.has(signature.signerId))
    );
    const sellerSigned = contractWithSignatures.signatures.some(
      (signature) => Boolean(signature.signedAt && signature.signerId && sellerMemberIds.has(signature.signerId))
    );
    const allSigned = buyerSigned && sellerSigned;
    const newStatus = allSigned ? "FULLY_SIGNED" : buyerSigned || sellerSigned ? "PARTIALLY_SIGNED" : contract.status;
    await prisma.contract.update({ where: { id: contract.id }, data: { status: newStatus } });
    
    // Audit: Log that this contract was signed
    await recordActivity({
      orgId: contract.orgId,
      eventId: contract.eventId,
      actorId: user.id,
      action: ACTIVITY_ACTIONS.CONTRACT_SIGNED,
      target: contract.id,
      meta: {
        signatureId: updatedSignature.id,
        signerName: input.typedName,
        signerEmail: updatedSignature.signerEmail,
        previousStatus,
        newStatus,
        isFullySigned: allSigned,
        method: updatedSignature.method,
      },
    });
    
    return updatedSignature;
  }),
  // SECURITY: permission check - user must be able to manage the event
  addChangeOrder: publicProcedure.input(z.object({
    contractId: z.string(),
    title: z.string(),
    bodyMd: z.string(),
    deltaCents: z.number().int(),
  })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: input.contractId },
      include: {
        proposal: {
          include: {
            event: {
              include: {
                org: {
                  include: { members: true },
                },
              },
            },
          },
        },
      },
    });
    if (!canManageEvent(user, contract.proposal.event)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to add change orders to this contract",
      });
    }
    const count = await prisma.changeOrder.count({ where: { contractId: input.contractId } });
    const changeOrder = await prisma.changeOrder.create({
      data: {
        contractId: input.contractId,
        number: count + 1,
        title: input.title,
        bodyMd: input.bodyMd,
        deltaCents: input.deltaCents,
      },
    });
    
    // Audit: Log that a change order was added to this contract
    await recordActivity({
      orgId: contract.orgId,
      eventId: contract.eventId,
      actorId: user?.id ?? undefined,
      action: ACTIVITY_ACTIONS.CHANGE_ORDER_ADDED,
      target: changeOrder.id,
      meta: {
        contractId: contract.id,
        changeOrderNumber: changeOrder.number,
        title: input.title,
        deltaCents: input.deltaCents,
      },
    });
    
    return changeOrder;
  }),
  // SECURITY: permission check - user must be buyer/seller OR be able to manage the event
  approveChangeOrder: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    const changeOrder = await prisma.changeOrder.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        contract: {
          include: {
            proposal: {
              include: {
                event: {
                  include: {
                    org: {
                      include: { members: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    // Check if user is buyer/seller (via contract.buyerId/sellerId) OR can manage the event
    const isBuyer = (changeOrder.contract as any).buyerId === user.id;
    const isSeller = (changeOrder.contract as any).sellerId === user.id;
    const canManage = canManageEvent(user, changeOrder.contract.proposal.event);
    if (!isBuyer && !isSeller && !canManage) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to approve this change order",
      });
    }
    const updated = await prisma.changeOrder.update({
      where: { id: input.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    
    // Audit: Log that this change order was approved
    await recordActivity({
      orgId: changeOrder.contract.orgId,
      eventId: changeOrder.contract.eventId,
      actorId: user?.id ?? undefined,
      action: ACTIVITY_ACTIONS.CHANGE_ORDER_APPROVED,
      target: changeOrder.id,
      meta: {
        contractId: changeOrder.contractId,
        changeOrderNumber: changeOrder.number,
        title: changeOrder.title,
        deltaCents: changeOrder.deltaCents,
        previousStatus: changeOrder.status,
        newStatus: "APPROVED",
      },
    });
    
    return updated;
  }),
});
