import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContractPageClient } from "@/components/contracts/ContractPageClient";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import Link from "next/link";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
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
            },
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

  const user = await getCurrentUser();
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

  const canEdit = user && contract.proposal?.event && canManageEvent(user, contract.proposal.event) && contract.status === "DRAFT";

  return (
    <ContractPageClient
      contract={contract}
      eventVaultHref={eventVaultHref}
      canEdit={canEdit}
    />
  );
}
