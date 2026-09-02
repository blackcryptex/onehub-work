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
const CLOSED_CONTRACT_STATUSES = new Set(["FULLY_SIGNED", "ACTIVE", "COMPLETED"]);
const SIGNABLE_CONTRACT_STATUSES = new Set(["OUT_FOR_SIGNATURE", "PARTIALLY_SIGNED"]);

type ContractSignerSide = "buyer" | "seller" | "unknown";

const SIGNER_SIDE_LABELS: Record<ContractSignerSide, string> = {
  buyer: "Planner/client/buyer side",
  seller: "Vendor/venue/seller side",
  unknown: "Signer",
};

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}

function getContractReadinessCopy({
  status,
  fromProviderBackedProposal,
}: {
  status: string;
  fromProviderBackedProposal: boolean;
}) {
  switch (status) {
    case "DRAFT":
      return {
        label: fromProviderBackedProposal
          ? "Draft agreement — review before signature"
          : "Draft agreement",
        description: fromProviderBackedProposal
          ? "This contract was generated from an accepted provider-backed proposal. It must be sent for signature before either side can sign. Payment stays locked until both sides have signed."
          : "Review the agreement before it is sent for signature. Draft contracts cannot be signed, and payment stays locked until the contract reaches a signed/payment-ready state.",
        tone: "amber",
      };
    case "OUT_FOR_SIGNATURE":
      return {
        label: "Ready/sent for signature",
        description: "The agreement is ready for signatures. Payment stays locked until both required sides have signed.",
        tone: "blue",
      };
    case "PARTIALLY_SIGNED":
      return {
        label: "Partially signed",
        description: "One side has signed. Payment stays locked until the remaining side signs.",
        tone: "blue",
      };
    case "FULLY_SIGNED":
      return {
        label: "Fully signed — payment-ready",
        description: "Both required sides have signed an accepted provider-backed proposal contract. Buyer-side users may enter the guarded payment step when payment access is available; release remains manual-review gated.",
        tone: "green",
      };
    case "IN_PAYMENT":
      return {
        label: "Payment-ready — payment step open",
        description: "The signed agreement is in the guarded payment step. Payment receipt, held-funds status, and provider release remain explicit states with manual trust oversight.",
        tone: "green",
      };
    default:
      return {
        label: formatStatusLabel(status),
        description: "Contract actions depend on the current contract status. Payment stays locked until the contract is signed/payment-ready.",
        tone: "slate",
      };
  }
}

function getReadinessClasses(tone: string) {
  switch (tone) {
    case "green":
      return "border-green-200 bg-green-50 text-green-950";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-950";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-950";
    default:
      return "border-slate-200 bg-slate-50 text-slate-950";
  }
}

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
  const canShowSignatureForm =
    SIGNABLE_CONTRACT_STATUSES.has(contract.status) &&
    !CLOSED_CONTRACT_STATUSES.has(contract.status) &&
    !currentUserAlreadySigned;
  const fromProviderBackedProposal = Boolean(
    contract.proposal?.providerBackedEvidence &&
      contract.proposal?.listing &&
      (contract.proposal?.status === "ACCEPTED" || contract.proposal?.status === "CONVERTED")
  );
  const canShowPaymentEntry = canEnterPayment && PAYABLE_CONTRACT_STATUSES.has(contract.status) && fromProviderBackedProposal;
  const readinessCopy = getContractReadinessCopy({
    status: contract.status,
    fromProviderBackedProposal,
  });
  const buyerSideSigned = Boolean(
    contract.buyerSideSigned ??
      contract.signatures?.some(
        (signature: any) => signature.signedAt && signature.signerSide === "buyer"
      )
  );
  const sellerSideSigned = Boolean(
    contract.sellerSideSigned ??
      contract.signatures?.some(
        (signature: any) => signature.signedAt && signature.signerSide === "seller"
      )
  );
  const nextSignatureSides =
    contract.status === "FULLY_SIGNED" || contract.status === "IN_PAYMENT"
      ? []
      : contract.status === "DRAFT"
        ? ["Send for signature before either side signs"]
      : [
          !buyerSideSigned ? SIGNER_SIDE_LABELS.buyer : null,
          !sellerSideSigned ? SIGNER_SIDE_LABELS.seller : null,
        ].filter(Boolean);
  const paymentReadinessLabel = canShowPaymentEntry
    ? "Payment entry available"
    : "Payment locked until provider-backed proposal evidence, accepted proposal state, and both contract signatures are complete";

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
          <div className="mt-1 text-sm text-slate-600">
            Status: {readinessCopy.label} ({contract.status})
          </div>
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

      <Card className={`space-y-4 border p-5 ${getReadinessClasses(readinessCopy.tone)}`}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Contract readiness
          </div>
          <h2 className="mt-1 text-lg font-semibold">{readinessCopy.label}</h2>
          <p className="mt-1 text-sm opacity-90">{readinessCopy.description}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/60 bg-white/70 p-3 text-sm text-slate-800">
            <div className="font-semibold text-slate-950">Who signs next</div>
            <p className="mt-1">
              {nextSignatureSides.length > 0
                ? nextSignatureSides.join(" and ")
                : "No signature needed — planner/client/buyer and vendor/venue/seller signatures are recorded."}
            </p>
          </div>
          <div className="rounded-lg border border-white/60 bg-white/70 p-3 text-sm text-slate-800">
            <div className="font-semibold text-slate-950">Payment gate</div>
            <p className="mt-1">{paymentReadinessLabel}</p>
          </div>
        </div>
      </Card>

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
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    {SIGNER_SIDE_LABELS[signature.signerSide as ContractSignerSide] ?? SIGNER_SIDE_LABELS.unknown}
                  </div>
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

      <Card className="p-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold">Change orders</h3>
            <p className="text-sm text-slate-600">
              Approved change orders increase committed budget exposure. Pending change orders are risk only and do not change payable, held, or paid state.
            </p>
          </div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Budget impact visibility
          </div>
        </div>
        {contract.changeOrders && contract.changeOrders.length > 0 ? (
          <div className="mt-4 space-y-3">
            {contract.changeOrders.map((order: any) => (
              <div key={order.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div className="font-medium text-slate-950">
                    CO #{order.number}: {order.title}
                  </div>
                  <div className={order.status === "APPROVED" ? "font-semibold text-green-700" : order.status === "PENDING" ? "font-semibold text-amber-700" : "font-semibold text-slate-600"}>
                    {formatStatusLabel(order.status)} • {formatMoney(order.deltaCents, contract.proposal?.currency ?? "USD")}
                  </div>
                </div>
                {order.bodyMd && <p className="mt-2 text-slate-600">{order.bodyMd}</p>}
                {order.approvedAt && (
                  <p className="mt-2 text-xs text-slate-500">Approved on {new Date(order.approvedAt).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            No change orders are attached to this contract yet. Use guarded contract change-order actions before treating scope changes as committed.
          </p>
        )}
      </Card>

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
              This payment is tied to this accepted provider-backed proposal, signed agreement, buyer-side authority, and event milestones. It does not approve live release or bypass manual trust review.
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
