import { Card, Button, LineItemsTable, TotalsSummary, ThreadPanel } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GenerateContractButton } from "@/components/contracts/GenerateContractButton";
import { ApproveProposalButton } from "@/components/proposals/ApproveProposalButton";
import { ProposalPageClient } from "@/components/proposals/ProposalPageClient";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import Link from "next/link";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: Date;
  senderId?: string | null;
};

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id: resolvedParams.id },
    include: { 
      lineItems: true, 
      milestones: true, 
      contract: true, 
      escrowAccount: true,
      event: {
        include: {
          org: {
            include: {
              owner: { select: { id: true } },
              members: { select: { userId: true } },
            },
          },
          createdBy: { select: { id: true } },
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
        },
      },
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });
  if (!proposal) return notFound();
  const thread = await prisma.thread.findFirst({ where: { proposalId: proposal.id }, include: { messages: true } });
  
  // Determine vault route based on user role
  const user = await getCurrentUser();
  let eventVaultHref: string | null = null;
  if (proposal.event?.slug) {
    if (user?.role === "DIY_PLANNER") {
      eventVaultHref = `/diy-planner/vault/${proposal.event.slug}`;
    } else if (user?.role === "PRO_PLANNER") {
      eventVaultHref = `/pro/planner/vault/${proposal.event.slug}`;
    } else {
      eventVaultHref = `/app/vault/${proposal.event.slug}`;
    }
  }
  
  const hasContent = proposal.summary || (proposal.sections && proposal.sections.length > 0) || (proposal.lineItems && proposal.lineItems.length > 0);
  const canEdit = user && canManageEvent(user, proposal.event) && (proposal.status === "DRAFT" || proposal.status === "SENT");
  
  return (
    <ProposalPageClient
      proposal={proposal}
      eventVaultHref={eventVaultHref}
      hasContent={hasContent}
      canEdit={canEdit}
      thread={thread ? {
        messages: thread.messages.map<ThreadMessage>((message) => ({
          id: message.id,
          bodyMd: message.bodyMd,
          createdAt: message.createdAt,
          senderId: message.senderId ?? null,
        })),
      } : null}
    />
  );
}
