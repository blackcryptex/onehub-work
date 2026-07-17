"use client";

import { Card } from "@/components/ui";
import { DollarSign, CheckCircle2, XCircle } from "lucide-react";

interface Deposit {
  id: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  createdAt: string;
  notes?: string | null;
}

interface DepositPanelProps {
  eventSlug: string;
  deposits: Deposit[];
}

export function DepositPanel({ eventSlug: _eventSlug, deposits }: DepositPanelProps) {
  const formatCurrency = (cents: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  };

  const getStatusBadge = (status: Deposit["status"]) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
            Refunded
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Payments</h3>
        </div>
        <p className="text-sm text-slate-600">
          Client payments are handled through signed contracts and their approved payment schedules.
        </p>
      </Card>

      {deposits.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold">Deposit History</h3>
          </div>

          <div className="space-y-3">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(deposit.amountCents, deposit.currency)}
                    </span>
                    {getStatusBadge(deposit.status)}
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(deposit.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  {deposit.notes && (
                    <div className="mt-1 text-sm text-slate-500">{deposit.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
