"use client";

import { useState } from "react";
import { Button } from "@onehub/ui";
import { formatCurrency } from "@/lib/types.payment";
import Link from "next/link";
import { contractDetail } from "@/lib/routes";

interface ProPlannerPaymentPanelProps {
  contractsAsSeller: Array<{
    id: string;
    title: string;
    status: string;
    buyerId?: string | null;
    proposal: {
      id: string;
      currency: string;
      milestones: Array<{
        id: string;
        title: string;
        amountCents: number;
        status: string;
        dueDate?: Date | null;
      }>;
    };
    event: {
      name: string;
    };
  }>;
  contractsAsBuyer: Array<{
    id: string;
    title: string;
    status: string;
    sellerId?: string | null;
    proposal: {
      id: string;
      currency: string;
      milestones: Array<{
        id: string;
        title: string;
        amountCents: number;
        status: string;
        dueDate?: Date | null;
      }>;
    };
    event: {
      name: string;
    };
  }>;
  onReleasePayment?: (milestoneId: string) => Promise<void>;
  onCopyPaymentLink?: (contractId: string) => void;
}

export function ProPlannerPaymentPanel({
  contractsAsSeller,
  contractsAsBuyer,
  onReleasePayment,
  onCopyPaymentLink,
}: ProPlannerPaymentPanelProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleReleasePayment = async (milestoneId: string) => {
    if (!onReleasePayment) return;
    
    setLoading((prev) => ({ ...prev, [milestoneId]: true }));
    try {
      await onReleasePayment(milestoneId);
      window.location.reload();
    } catch (error) {
      console.error("Error releasing payment:", error);
      alert("Failed to release payment");
    } finally {
      setLoading((prev) => ({ ...prev, [milestoneId]: false }));
    }
  };

  const handleCopyPaymentLink = (contractId: string) => {
    if (onCopyPaymentLink) {
      onCopyPaymentLink(contractId);
    } else {
      const link = `${window.location.origin}${contractDetail(contractId)}`;
      navigator.clipboard.writeText(link);
      alert("Payment link copied to clipboard!");
    }
  };

  // Contracts where planner is receiving payment (from clients)
  const receivingContracts = contractsAsSeller.filter((c) => {
    const hasPending = c.proposal.milestones.some((m) => m.status === "PENDING" || m.status === "OVERDUE");
    const hasHeldFunds = c.proposal.milestones.some((m) => m.status === "IN_ESCROW");
    return hasPending || hasHeldFunds;
  });

  // Contracts where planner is paying vendors
  const payingContracts = contractsAsBuyer.filter((c) => {
    const hasHeldFunds = c.proposal.milestones.some((m) => m.status === "IN_ESCROW");
    return hasHeldFunds;
  });

  return (
    <div className="space-y-6">
      {/* Receiving Payments Section */}
      {receivingContracts.length > 0 && (
        <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Receiving Payments from Clients</h3>
          <div className="space-y-4">
            {receivingContracts.map((contract) => {
              const milestones = contract.proposal.milestones;
              const pending = milestones.filter((m) => m.status === "PENDING" || m.status === "OVERDUE");
              const heldFundsMilestones = milestones.filter((m) => m.status === "IN_ESCROW");
              const totalOwed = pending.reduce((sum, m) => sum + m.amountCents, 0);
              const totalHeldFunds = heldFundsMilestones.reduce((sum, m) => sum + m.amountCents, 0);

              return (
                <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900">{contract.title}</div>
                      <div className="text-sm text-slate-600 mt-1">Event: {contract.event.name}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {contract.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2 bg-amber-50 rounded">
                      <div className="text-xs text-amber-600">Client Owes</div>
                      <div className="text-sm font-semibold text-amber-700">
                        {formatCurrency(totalOwed, contract.proposal.currency)}
                      </div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-xs text-blue-600">Funds Held</div>
                      <div className="text-sm font-semibold text-blue-700">
                        {formatCurrency(totalHeldFunds, contract.proposal.currency)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyPaymentLink(contract.id)}
                    >
                      Copy Payment Link
                    </Button>
                    {/* Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript */}
                    <Link href={contractDetail(contract.id) as any}>
                      <Button size="sm" variant="secondary">
                        View Contract
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paying Vendors Section */}
      {payingContracts.length > 0 && (
        <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Vendor Payments</h3>
          <div className="space-y-4">
            {payingContracts.map((contract) => {
              const milestones = contract.proposal.milestones;
              const heldFundsMilestones = milestones.filter((m) => m.status === "IN_ESCROW");
              const totalHeldFunds = heldFundsMilestones.reduce((sum, m) => sum + m.amountCents, 0);

              return (
                <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900">{contract.title}</div>
                      <div className="text-sm text-slate-600 mt-1">Event: {contract.event.name}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                      {contract.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="p-2 bg-blue-50 rounded mb-3">
                    <div className="text-xs text-blue-600">Available to Release</div>
                    <div className="text-sm font-semibold text-blue-700">
                      {formatCurrency(totalHeldFunds, contract.proposal.currency)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {heldFundsMilestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{milestone.title}</div>
                          {milestone.dueDate && (
                            <div className="text-xs text-slate-600">
                              Due: {new Date(milestone.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold">
                            {formatCurrency(milestone.amountCents, contract.proposal.currency)}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleReleasePayment(milestone.id)}
                            disabled={loading[milestone.id]}
                          >
                            {loading[milestone.id] ? "Processing..." : "Release Payment"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    {/* Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript */}
                    <Link
                      href={contractDetail(contract.id) as any}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View Contract Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {receivingContracts.length === 0 && payingContracts.length === 0 && (
        <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-2">Payments</h3>
          <p className="text-slate-600">No payments pending at this time.</p>
        </div>
      )}
    </div>
  );
}

