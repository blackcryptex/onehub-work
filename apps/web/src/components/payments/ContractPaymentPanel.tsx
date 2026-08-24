"use client";

import { useState } from "react";
import { Button } from "@onehub/ui";
import { PaymentModal } from "./PaymentModal";
import {
  formatCurrency,
  getNextUnpaidMilestone,
  calculateTotalDue,
  calculateHeldFundsAmount,
  calculatePaidAmount,
  isContractInPayment,
} from "@/lib/types.payment";
import type { PaymentMilestone, Contract } from "@/lib/types.payment";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { PUBLIC_LEGAL_PAGES } from "@/lib/legal-surface";

interface ContractPaymentPanelProps {
  contract: Contract & {
    milestones?: PaymentMilestone[];
    proposal?: {
      currency: string;
      event?: { name?: string | null } | null;
      listing?: {
        title?: string | null;
        org?: { name?: string | null } | null;
      } | null;
    };
  };
  canPay: boolean;
  onPaymentSuccess?: () => void;
}

export function ContractPaymentPanel({
  contract,
  canPay,
  onPaymentSuccess,
}: ContractPaymentPanelProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<PaymentMilestone | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedPaymentTerms, setAcceptedPaymentTerms] = useState(false);

  const milestones = contract.milestones || [];
  const nextMilestone = getNextUnpaidMilestone(milestones);
  const totalDue = calculateTotalDue(milestones);
  const heldFundsAmount = calculateHeldFundsAmount(milestones);
  const paidAmount = calculatePaidAmount(milestones);
  const inPayment = isContractInPayment(contract);
  const currency = contract.proposal?.currency || "USD";
  const payeeLabel = contract.proposal?.listing?.org?.name || contract.proposal?.listing?.title || "the contracted provider";
  const eventLabel = contract.proposal?.event?.name || "this event";

  const handlePayMilestone = async (milestone: PaymentMilestone) => {
    // Double-click protection: prevent concurrent requests
    if (isProcessing || loading) return;
    
    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          milestoneId: milestone.id,
          acceptance: {
            accepted: true,
            legalVersion: CURRENT_ACCEPTANCE_VERSIONS.payment,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment intent");
      }

      const data = await response.json();
      setPaymentIntentId(data.paymentIntentId);
      setClientSecret(data.clientSecret);
      setSelectedMilestone(milestone);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handlePayFullAmount = async () => {
    // Double-click protection: prevent concurrent requests
    if (isProcessing || loading) return;
    
    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          amountCents: totalDue,
          acceptance: {
            accepted: true,
            legalVersion: CURRENT_ACCEPTANCE_VERSIONS.payment,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment intent");
      }

      const data = await response.json();
      setPaymentIntentId(data.paymentIntentId);
      setClientSecret(data.clientSecret);
      setSelectedMilestone(null);
      setShowPaymentModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentIntentId(null);
    setClientSecret(null);
    setSelectedMilestone(null);
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
    // Refresh the page to show updated status
    window.location.reload();
  };

  if (!inPayment || !canPay) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold">Guarded payment readiness</h3>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
          <p className="font-medium">What this payment covers</p>
          <p className="mt-1">
            Buyer-side payment is for the signed contract milestones for {eventLabel}. Funds are paid by the buyer side and recorded for {payeeLabel}; release remains subject to admin/manual review, holdbacks, refunds, disputes, and provider payout configuration.
          </p>
          <p className="mt-2 text-blue-900">
            OneHub is not marking anything as paid until Stripe confirmation is persisted. Any pending payout or held-funds status is an internal readiness/review state, not a public escrow or legal approval promise.
          </p>
        </div>
        <LegalNotice
          label="Payment authorization uses the current guarded MVP payment terms and held-funds policy."
          version={CURRENT_ACCEPTANCE_VERSIONS.payment}
          href={PUBLIC_LEGAL_PAGES.payments}
        />
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acceptedPaymentTerms}
            onChange={(event) => setAcceptedPaymentTerms(event.target.checked)}
            className="mt-1"
          />
          <span>I acknowledge this payment is authorized under the accepted provider-backed proposal, signed contract, and milestone schedule, with release subject to manual trust review.</span>
        </label>

        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">Payable now</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatCurrency(totalDue, currency)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">Held pending review</div>
            <div className="text-lg font-semibold text-emerald-600">
              {formatCurrency(heldFundsAmount, currency)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">Paid</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatCurrency(paidAmount, currency)}
            </div>
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && (
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-slate-900">{nextMilestone.title}</div>
                {nextMilestone.dueDate && (
                  <div className="text-sm text-slate-600">
                    Due: {new Date(nextMilestone.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(nextMilestone.amountCents, currency)}
              </div>
            </div>
            <Button
              onClick={() => handlePayMilestone(nextMilestone)}
              disabled={loading || isProcessing || !acceptedPaymentTerms}
              className="w-full mt-3"
            >
              {loading || isProcessing ? "Processing..." : `Authorize milestone payment (${formatCurrency(nextMilestone.amountCents, currency)})`}
            </Button>
          </div>
        )}

        {/* Payment Schedule */}
        {milestones.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Payment Schedule</h4>
            <div className="space-y-2">
              {milestones.map((milestone) => {
                const isPaid = milestone.status === "PAID";
                const isHeldFunds = milestone.status === "IN_ESCROW";
                const isPending = milestone.status === "PENDING" || milestone.status === "OVERDUE";

                return (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{milestone.title}</div>
                      {milestone.dueDate && (
                        <div className="text-xs text-slate-600">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">
                        {formatCurrency(milestone.amountCents, currency)}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700"
                            : isHeldFunds
                            ? "bg-blue-100 text-blue-700"
                            : isPending
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {milestone.status === "IN_ESCROW" ? "HELD PENDING REVIEW" : milestone.status.replace("_", " ")}
                      </span>
                      {isPending && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePayMilestone(milestone)}
                          disabled={loading || isProcessing || !acceptedPaymentTerms}
                        >
                          Authorize
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pay Full Amount Button */}
        {totalDue > 0 && (
          <Button
            variant="secondary"
            onClick={handlePayFullAmount}
            disabled={loading || isProcessing || !acceptedPaymentTerms}
            className="w-full"
          >
            {loading || isProcessing ? "Processing..." : `Authorize payable balance (${formatCurrency(totalDue, currency)})`}
          </Button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {showPaymentModal && paymentIntentId && clientSecret && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentIntentId(null);
            setClientSecret(null);
          }}
          amountCents={selectedMilestone?.amountCents || totalDue}
          currency={currency}
          milestoneLabel={selectedMilestone?.title}
          paymentIntentId={paymentIntentId}
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
