"use client";

import { useState } from "react";
import { Button } from "@onehub/ui";
import { formatCurrency } from "@/lib/types.payment";
import Link from "next/link";

interface VendorPaymentPanelProps {
  contracts: Array<{
    id: string;
    title: string;
    status: string;
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
      startAt: Date;
    };
  }>;
  onMarkComplete?: (milestoneId: string) => Promise<void>;
}

export function VendorPaymentPanel({ contracts, onMarkComplete }: VendorPaymentPanelProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleMarkComplete = async (milestoneId: string) => {
    if (!onMarkComplete) return;
    
    setLoading((prev) => ({ ...prev, [milestoneId]: true }));
    try {
      await onMarkComplete(milestoneId);
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error marking milestone complete:", error);
      alert("Failed to mark milestone as complete");
    } finally {
      setLoading((prev) => ({ ...prev, [milestoneId]: false }));
    }
  };

  const contractsWithPayments = contracts.filter((c) => {
    const hasInEscrow = c.proposal.milestones.some((m) => m.status === "IN_ESCROW");
    const hasPending = c.proposal.milestones.some((m) => m.status === "PENDING" || m.status === "OVERDUE");
    return hasInEscrow || hasPending;
  });

  if (contractsWithPayments.length === 0) {
    return (
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Payments</h3>
        <p className="text-slate-600">No payments pending at this time.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6 space-y-4">
      <h3 className="text-lg font-semibold">Payments & Contracts</h3>
      
      <div className="space-y-4">
        {contractsWithPayments.map((contract) => {
          const milestones = contract.proposal.milestones;
          const inEscrow = milestones.filter((m) => m.status === "IN_ESCROW");
          const pending = milestones.filter((m) => m.status === "PENDING" || m.status === "OVERDUE");
          const paid = milestones.filter((m) => m.status === "PAID");
          
          const totalAmount = milestones.reduce((sum, m) => sum + m.amountCents, 0);
          const escrowAmount = inEscrow.reduce((sum, m) => sum + m.amountCents, 0);
          const paidAmount = paid.reduce((sum, m) => sum + m.amountCents, 0);

          return (
            <div key={contract.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{contract.title}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Event: {contract.event.name} • {new Date(contract.event.startAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  contract.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                  contract.status === "IN_PAYMENT" || contract.status === "ACTIVE" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {contract.status.replace("_", " ")}
                </span>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-600">Total</div>
                  <div className="text-sm font-semibold">{formatCurrency(totalAmount, contract.proposal.currency)}</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs text-blue-600">In Escrow</div>
                  <div className="text-sm font-semibold text-blue-700">{formatCurrency(escrowAmount, contract.proposal.currency)}</div>
                </div>
                <div className="p-2 bg-emerald-50 rounded">
                  <div className="text-xs text-emerald-600">Paid</div>
                  <div className="text-sm font-semibold text-emerald-700">{formatCurrency(paidAmount, contract.proposal.currency)}</div>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                {milestones.map((milestone) => {
                  const isInEscrow = milestone.status === "IN_ESCROW";
                  const isPending = milestone.status === "PENDING" || milestone.status === "OVERDUE";
                  const isPaid = milestone.status === "PAID";

                  return (
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
                        {isInEscrow && onMarkComplete && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkComplete(milestone.id)}
                            disabled={loading[milestone.id]}
                          >
                            {loading[milestone.id] ? "Processing..." : "Mark Complete"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200">
                {/* Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript */}
                <Link
                  href={`/app/contracts/${contract.id}` as any}
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
  );
}

