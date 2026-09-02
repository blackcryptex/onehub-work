import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { resolveContractTemplate } from "@/server/lib/contracts";
import { recordActivity, ACTIVITY_ACTIONS } from "@/server/lib/activity";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent, canViewCommercialContract, commercialContractAccessInclude } from "@/lib/rbac";
import type { AppUser } from "@/lib/auth-helpers";
import { canUserApproveContractChangeOrder } from "@/server/lib/event-financial-summary";

const SIGNABLE_CONTRACT_STATUSES = new Set(["OUT_FOR_SIGNATURE", "PARTIALLY_SIGNED"]);

function assertContractIsSignable(status: string): void {
  if (!SIGNABLE_CONTRACT_STATUSES.has(status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        status === "DRAFT"
          ? "This contract is still a draft. Send it for signature before signing."
          : "This contract is not in a signable state.",
    });
  }
}

/**
 * SECURITY: Authorization helper for contract access.
 * Determines if user can access a contract based on:
 * - commercial proposal detail readers
 * - intended contract signers by id or case-insensitive email
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
    include: commercialContractAccessInclude,
  });

  if (!contract) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Contract not found",
    });
  }

  if (canViewCommercialContract(user, contract)) {
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
    assertContractIsSignable(signature.contract.status);

    if (signature.signedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This signature has already been recorded",
      });
    }

    // User must be the intended signer. Event managers cannot sign the opposite-party slot.
    const isSigner = signature.signerEmail.toLowerCase() === (user.email ?? "").toLowerCase();
    if (!isSigner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the intended signer can sign this contract signature",
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
      [
        contractWithSignatures.proposal.event.org.ownerId,
        ...contractWithSignatures.proposal.event.org.members.map((member) => member.userId),
      ].filter((id): id is string => Boolean(id))
    );
    const sellerMemberIds = new Set(
      [
        contractWithSignatures.proposal.listing?.org?.ownerId,
        ...(contractWithSignatures.proposal.listing?.org?.members ?? []).map((member) => member.userId),
      ].filter((id): id is string => Boolean(id))
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
    if (!canUserApproveContractChangeOrder(user, changeOrder.contract)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to approve this change order",
      });
    }
    if (changeOrder.status === "APPROVED") {
      return changeOrder;
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
