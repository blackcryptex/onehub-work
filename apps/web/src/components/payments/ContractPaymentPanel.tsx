"use client";

import { useState, useEffect } from "react";
import { Button } from "@onehub/ui";
import { PaymentModal } from "./PaymentModal";
import {
  formatCurrency,
  getNextUnpaidMilestone,
  calculateTotalDue,
  calculateEscrowAmount,
  calculatePaidAmount,
  isContractInPayment,
} from "@/lib/types.payment";
import type { PaymentMilestone, Contract } from "@/lib/types.payment";

interface ContractPaymentPanelProps {
  contract: Contract & {
    milestones?: PaymentMilestone[];
    proposal?: {
      currency: string;
    };
  };
  userId: string;
  onPaymentSuccess?: () => void;
}

export function ContractPaymentPanel({
  contract,
  userId,
  onPaymentSuccess,
}: ContractPaymentPanelProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<PaymentMilestone | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const milestones = contract.milestones || [];
  const nextMilestone = getNextUnpaidMilestone(milestones);
  const totalDue = calculateTotalDue(milestones);
  const escrowAmount = calculateEscrowAmount(milestones);
  const paidAmount = calculatePaidAmount(milestones);
  const canPay = contract.buyerId === userId;
  const inPayment = isContractInPayment(contract);

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
        <h3 className="text-lg font-semibold">Payment</h3>

        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">Total Due</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatCurrency(totalDue, contract.proposal?.currency || "USD")}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">In Escrow</div>
            <div className="text-lg font-semibold text-emerald-600">
              {formatCurrency(escrowAmount, contract.proposal?.currency || "USD")}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-600 mb-1">Paid</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatCurrency(paidAmount, contract.proposal?.currency || "USD")}
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
                {formatCurrency(nextMilestone.amountCents, contract.proposal?.currency || "USD")}
              </div>
            </div>
            <Button
              onClick={() => handlePayMilestone(nextMilestone)}
              disabled={loading || isProcessing}
              className="w-full mt-3"
            >
              {loading || isProcessing ? "Processing..." : `Pay ${formatCurrency(nextMilestone.amountCents, contract.proposal?.currency || "USD")}`}
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
                const isInEscrow = milestone.status === "IN_ESCROW";
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
                        {formatCurrency(milestone.amountCents, contract.proposal?.currency || "USD")}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700"
                            : isInEscrow
                            ? "bg-blue-100 text-blue-700"
                            : isPending
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {milestone.status.replace("_", " ")}
                      </span>
                      {isPending && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePayMilestone(milestone)}
                          disabled={loading || isProcessing}
                        >
                          Pay
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
            disabled={loading || isProcessing}
            className="w-full"
          >
            {loading || isProcessing ? "Processing..." : `Pay Full Amount (${formatCurrency(totalDue, contract.proposal?.currency || "USD")})`}
          </Button>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {showPaymentModal && paymentIntentId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentIntentId(null);
            setClientSecret(null);
          }}
          amountCents={selectedMilestone?.amountCents || totalDue}
          currency={contract.proposal?.currency || "USD"}
          milestoneLabel={selectedMilestone?.title}
          paymentIntentId={paymentIntentId || undefined}
          clientSecret={clientSecret || undefined}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

