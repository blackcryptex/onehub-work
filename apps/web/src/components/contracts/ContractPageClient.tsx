"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { ContractEditor } from "@/components/contracts/ContractEditor";
import { ContractSignatureForm } from "@/components/contracts/ContractSignatureForm";
import Link from "next/link";
import { Edit2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ContractPageClientProps {
  contract: any;
  eventVaultHref: string | null;
  canEdit: boolean;
}

export function ContractPageClient({
  contract,
  eventVaultHref,
  canEdit,
}: ContractPageClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="space-y-6">
        <ContractEditor
          contract={{
            id: contract.id,
            title: contract.title,
            bodyMd: contract.bodyMd,
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
          <h1 className="text-2xl font-bold">{contract.title || "Contract"}</h1>
          <div className="mt-1 text-sm text-slate-600">Status: {contract.status}</div>
          {contract.proposal?.event && (
            <div className="mt-2 text-sm text-slate-500">
              Event: {eventVaultHref ? (
                <Link href={eventVaultHref as any} className="text-indigo-600 hover:underline">
                  {contract.proposal.event.name}
                </Link>
              ) : (
                contract.proposal.event.name
              )}
            </div>
          )}
          {contract.proposal?.listing && (
            <div className="mt-1 text-sm text-slate-500">
              Vendor/Venue: {contract.proposal.listing.title} ({contract.proposal.listing.type})
            </div>
          )}
        </div>
        {canEdit && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="secondary"
            size="sm"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <Card className="p-6">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{contract.bodyMd}</ReactMarkdown>
        </div>
      </Card>

      {contract.signatures && contract.signatures.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Signatures</h3>
          <div className="space-y-3">
            {contract.signatures.map((signature: any) => (
              <div
                key={signature.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <div className="font-medium">{signature.signerName}</div>
                  <div className="text-sm text-slate-500">{signature.signerEmail}</div>
                </div>
                {signature.signedAt ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Signed: {new Date(signature.signedAt).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Pending</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Show signature form if contract is not fully signed and user hasn't signed yet */}
      {contract.status !== "FULLY_SIGNED" &&
        contract.status !== "ACTIVE" &&
        contract.status !== "COMPLETED" && (
          <ContractSignatureForm
            contractId={contract.id}
            onSuccess={() => {
              // Contract will refresh via router.refresh()
            }}
          />
        )}
    </div>
  );
}

