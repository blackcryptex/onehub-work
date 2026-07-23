import { Card, Button, LineItemsTable, TotalsSummary, ThreadPanel } from "@onehub/ui";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { GenerateContractButton } from "@/components/contracts/GenerateContractButton";
import { ApproveProposalButton } from "@/components/proposals/ApproveProposalButton";
import { ProposalPageClient } from "@/components/proposals/ProposalPageClient";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { proposalReturnPath } from "@/lib/routes";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: Date;
  senderId?: string | null;
};

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const proposal = await db.proposal.findUnique({
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
  const thread = await db.thread.findFirst({ where: { proposalId: proposal.id }, include: { messages: true } });
  
  const user = await getCurrentUser();
  const eventVaultHref = proposal.event?.slug ? proposalReturnPath(user?.role, proposal.event.slug) : null;
  
  const hasContent = Boolean(proposal.summary || (proposal.sections && proposal.sections.length > 0) || (proposal.lineItems && proposal.lineItems.length > 0));
  const canEdit = Boolean(user && canManageEvent(user, proposal.event) && (proposal.status === "DRAFT" || proposal.status === "SENT"));
  
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
