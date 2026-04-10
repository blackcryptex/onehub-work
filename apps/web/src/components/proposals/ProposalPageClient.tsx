"use client";

import { useState } from "react";
import { Card, Button, LineItemsTable, TotalsSummary, ThreadPanel } from "@onehub/ui";
import { GenerateContractButton } from "@/components/contracts/GenerateContractButton";
import { ApproveProposalButton } from "@/components/proposals/ApproveProposalButton";
import { ProposalEditor } from "@/components/proposals/ProposalEditor";
import { DeleteProposalButton } from "@/components/proposals/DeleteProposalButton";
import Link from "next/link";
import { Edit2, Trash2 } from "lucide-react";
import { contractDetail } from "@/lib/routes";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";
import { PUBLIC_LEGAL_PAGES } from "@/lib/legal-surface";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: Date;
  senderId?: string | null;
};

interface ProposalPageClientProps {
  proposal: any;
  eventVaultHref: string | null;
  hasContent: boolean;
  canEdit: boolean;
  thread: { messages: ThreadMessage[] } | null;
}

export function ProposalPageClient({
  proposal,
  eventVaultHref,
  hasContent,
  canEdit,
  thread,
}: ProposalPageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  if (isEditing) {
    return (
      <div className="space-y-6">
        <ProposalEditor
          proposal={{
            id: proposal.id,
            title: proposal.title,
            summary: proposal.summary,
            terms: proposal.terms,
            subtotalCents: proposal.subtotalCents,
            taxCents: proposal.taxCents,
            totalCents: proposal.totalCents,
          }}
          onCancel={() => setIsEditing(false)}
          onSave={() => {
            setIsEditing(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{proposal.title || "Proposal"}</h1>
          <div className="mt-1 text-sm text-slate-600">Status: {proposal.status}</div>
          {proposal.event && (
            <div className="mt-2 text-sm text-slate-500">
              Event: {eventVaultHref ? (
                <Link href={eventVaultHref as any} className="text-indigo-600 hover:underline">{proposal.event.name}</Link>
              ) : (
                proposal.event.name
              )}
              {proposal.event.startAt && (
                <> • {new Date(proposal.event.startAt).toLocaleDateString()}</>
              )}
              {proposal.event.venueCity && (
                <> • {proposal.event.venueCity}{proposal.event.venueState ? `, ${proposal.event.venueState}` : ''}</>
              )}
            </div>
          )}
          {proposal.listing && (
            <div className="mt-1 text-sm text-slate-500">
              Vendor/Venue: {proposal.listing.title} ({proposal.listing.type})
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              size="sm"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <DeleteProposalButton proposalId={proposal.id} />
          </div>
        )}
      </div>
      {proposal.summary && (
        <Card className="p-4">
          <p className="text-sm leading-relaxed">{proposal.summary}</p>
        </Card>
      )}
      {proposal.sections && proposal.sections.length > 0 ? (
        <div className="space-y-4">
          {proposal.sections.map((section: any) => (
            <Card key={section.id} className="p-6">
              <h2 className="mb-3 text-lg font-semibold">{section.heading}</h2>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                {section.body}
              </div>
            </Card>
          ))}
        </div>
      ) : !hasContent ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <p className="text-slate-600 mb-4">This proposal doesn't have any content yet.</p>
            <p className="text-sm text-slate-500">
              The proposal may still be generating. Please refresh the page or contact support if this persists.
            </p>
          </div>
        </Card>
      ) : null}
      {proposal.lineItems && proposal.lineItems.length > 0 ? (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Pricing Breakdown</h2>
          <LineItemsTable items={proposal.lineItems.map((item: any) => ({ ...item, unit: item.unit ?? undefined }))} currency={proposal.currency} />
          <div className="mt-4">
            <TotalsSummary
              subtotalCents={proposal.subtotalCents}
              taxCents={proposal.taxCents}
              totalCents={proposal.totalCents}
              currency={proposal.currency}
            />
          </div>
        </Card>
      ) : null}
      {proposal.milestones && proposal.milestones.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Payment Schedule</h2>
          <div className="space-y-3">
            {proposal.milestones.map((milestone: any) => (
              <div key={milestone.id} className="flex items-start justify-between border-b border-slate-200 pb-3 last:border-0">
                <div className="flex-1">
                  <div className="font-medium">{milestone.title}</div>
                  {milestone.description && (
                    <div className="mt-1 text-sm text-slate-600">{milestone.description}</div>
                  )}
                  {milestone.dueDate && (
                    <div className="mt-1 text-xs text-slate-500">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {milestone.dueOffsetDays && milestone.dueOffsetDays < 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      Due: {Math.abs(milestone.dueOffsetDays)} days before event
                    </div>
                  )}
                </div>
                <div className="font-semibold">
                  ${(milestone.amountCents / 100).toFixed(2)} {proposal.currency}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {(proposal.status === "SENT" || proposal.status === "DRAFT") && (
        <Card className="p-4 space-y-4">
          <h3 className="mb-2 font-semibold">Approve Proposal</h3>
          <p className="mb-4 text-sm text-slate-600">
            Review the proposal details above. Once approved, you can generate a formal contract.
          </p>
          <LegalNotice
            label="Proposal approval records acceptance of the guarded MVP commercial terms for this booking flow."
            version={CURRENT_ACCEPTANCE_VERSIONS.proposal}
            href={PUBLIC_LEGAL_PAGES.terms}
          />
          <ApproveProposalButton proposalId={proposal.id} />
        </Card>
      )}
      {(proposal.status === "ACCEPTED" || proposal.status === "CONVERTED") && !proposal.contract && (
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Generate Contract</h3>
          <p className="mb-4 text-sm text-slate-600">
            This proposal has been accepted. Generate a formal contract for e-signing.
          </p>
          <GenerateContractButton proposalId={proposal.id} />
        </Card>
      )}
      {proposal.contract && (
        <div className="flex gap-2">
          <Button asChild>
            <Link href={contractDetail(proposal.contract.id) as any}>View Contract</Link>
          </Button>
        </div>
      )}
      {thread && (
        <ThreadPanel
          messages={thread.messages}
          onSend={() => {}}
        />
      )}
    </div>
  );
}

