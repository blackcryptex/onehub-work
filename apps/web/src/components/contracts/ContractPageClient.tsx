"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { ContractEditor } from "@/components/contracts/ContractEditor";
import { ContractSignatureForm } from "@/components/contracts/ContractSignatureForm";
import { ContractPaymentPanel } from "@/components/payments/ContractPaymentPanel";
import Link from "next/link";
import { Edit2, CheckCircle2, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";
import { PUBLIC_LEGAL_PAGES } from "@/lib/legal-surface";

const PAYABLE_CONTRACT_STATUSES = new Set(["FULLY_SIGNED", "IN_PAYMENT"]);

interface ContractPageClientProps {
  contract: any;
  eventVaultHref: string | null;
  canEdit: boolean;
  canEnterPayment: boolean;
  sellerSidePrefilledSignerEmail?: string;
  currentUserAlreadySigned?: boolean;
  currentUserSignedAt?: string | null;
}

export function ContractPageClient({
  contract,
  eventVaultHref,
  canEdit,
  canEnterPayment,
  sellerSidePrefilledSignerEmail,
  currentUserAlreadySigned = false,
  currentUserSignedAt,
}: ContractPageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const canShowPaymentEntry = canEnterPayment && PAYABLE_CONTRACT_STATUSES.has(contract.status);
  const canShowSignatureForm =
    contract.status !== "FULLY_SIGNED" &&
    contract.status !== "ACTIVE" &&
    contract.status !== "COMPLETED" &&
    !currentUserAlreadySigned;

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
        <div className="flex items-center gap-2">
          {canShowPaymentEntry && (
            <Button asChild size="sm">
              <a href="#contract-payment">
                Enter payment
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          )}
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

      <LegalNotice
        label="Contract signing and payment actions are tied to the current guarded MVP legal text."
        version={CURRENT_ACCEPTANCE_VERSIONS.contract}
        href={PUBLIC_LEGAL_PAGES.terms}
      />

      {canShowPaymentEntry && (
        <section id="contract-payment" className="space-y-3 scroll-mt-24">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payment entry</h2>
            <p className="text-sm text-slate-600">
              This payment is tied to this signed agreement and its event milestones.
            </p>
          </div>
          <ContractPaymentPanel
            contract={contract}
            canPay={canEnterPayment}
          />
        </section>
      )}

      {currentUserAlreadySigned && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold">You already signed this contract</h3>
              <p className="text-sm text-slate-600">
                Your signature is already recorded. This page is now in a safe repeat-entry state.
              </p>
              {currentUserSignedAt && (
                <p className="mt-2 text-sm text-slate-500">
                  Signed on {new Date(currentUserSignedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Show signature form only when the current user still needs to sign */}
      {canShowSignatureForm && (
        <ContractSignatureForm
          contractId={contract.id}
          prefilledSignerEmail={sellerSidePrefilledSignerEmail}
          onSuccess={() => {
            // Contract will refresh via router.refresh()
          }}
        />
      )}
    </div>
  );
}
