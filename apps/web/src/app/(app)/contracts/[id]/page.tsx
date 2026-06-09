import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContractPageClient } from "@/components/contracts/ContractPageClient";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const user = await getCurrentUser();
  const contract = await prisma.contract.findUnique({
    where: { id: resolvedParams.id },
    include: {
      proposal: {
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
              orgId: true,
              createdById: true,
              org: {
                select: {
                  ownerId: true,
                  members: {
                    select: { userId: true },
                  },
                },
              },
            },
          },
          milestones: {
            orderBy: [
              { dueDate: "asc" },
            ],
          },
          listing: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      },
      signatures: {
        orderBy: { signedAt: "asc" },
      },
    },
  });

  if (!contract) return notFound();

  let eventVaultHref: string | null = null;
  if (contract.proposal?.event?.slug) {
    if (user?.role === "DIY_PLANNER") {
      eventVaultHref = `/diy-planner/vault/${contract.proposal.event.slug}`;
    } else if (user?.role === "PRO_PLANNER") {
      eventVaultHref = `/pro/planner/vault/${contract.proposal.event.slug}`;
    } else {
      eventVaultHref = `/app/vault/${contract.proposal.event.slug}`;
    }
  }

  const canEdit = Boolean(user && contract.proposal?.event && canManageEvent(user, contract.proposal.event) && contract.status === "DRAFT");
  const isBuyerSideUser = Boolean(
    user &&
      contract.buyerId &&
      contract.buyerId === contract.proposal?.event?.orgId &&
      (
        contract.proposal?.event?.org?.ownerId === user.id ||
        contract.proposal?.event?.org?.members?.some((member) => member.userId === user.id)
      )
  );
  const sellerSidePrefilledSignerEmail =
    user && !isBuyerSideUser && (user.role === "VENDOR" || user.role === "VENUE")
      ? user.email ?? undefined
      : undefined;
  const currentUserSignature = user
    ? contract.signatures.find((signature) => {
        const signatureEmail = signature.signerEmail?.toLowerCase();
        const userEmail = user.email?.toLowerCase();
        return Boolean(
          signature.signedAt &&
          ((signature.signerId && signature.signerId === user.id) ||
            (signatureEmail && userEmail && signatureEmail === userEmail))
        );
      })
    : null;

  return (
    <ContractPageClient
      contract={{
        ...contract,
        milestones: contract.proposal?.milestones ?? [],
      }}
      eventVaultHref={eventVaultHref}
      canEdit={canEdit}
      canEnterPayment={isBuyerSideUser}
      sellerSidePrefilledSignerEmail={sellerSidePrefilledSignerEmail}
      currentUserAlreadySigned={Boolean(currentUserSignature)}
      currentUserSignedAt={currentUserSignature?.signedAt?.toISOString() ?? null}
    />
  );
}
