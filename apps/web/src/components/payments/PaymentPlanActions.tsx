"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, Pencil, Trash2 } from "lucide-react";

interface DepositActionsProps {
  depositId: string;
  currentStatus: string;
  onEdit: () => void;
  onDelete: () => void;
  isDemoMode: boolean;
  isPlanner: boolean;
}

export function DepositActions({
  depositId,
  currentStatus,
  onEdit,
  onDelete,
  isDemoMode,
  isPlanner,
}: DepositActionsProps) {
  const [funding, setFunding] = useState(false);
  const router = useRouter();

  const handleFund = async () => {
    if (!isDemoMode || currentStatus !== "PENDING") return;

    setFunding(true);
    try {
      const response = await fetch(`/api/demo/milestones/${depositId}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fund deposit");
      }

      router.refresh();
    } catch (err) {
      console.error("Error funding deposit:", err);
      alert(err instanceof Error ? err.message : "Failed to fund deposit");
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isPlanner && (
        <>
          <Button
            onClick={onEdit}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Edit deposit"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={onDelete}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
            title="Delete deposit"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
      {isDemoMode && currentStatus === "PENDING" && (
        <Button
          onClick={handleFund}
          disabled={funding}
          size="sm"
          variant="default"
          className="flex items-center gap-1"
        >
          {funding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Funding...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" />
              Simulate Client Pay
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface PayoutActionsProps {
  payoutId: string;
  currentStatus: string;
  amountCents: number;
  heldFundsBalanceCents: number;
  onEdit: () => void;
  onDelete: () => void;
  isDemoMode: boolean;
  isPlanner: boolean;
  isLocked?: boolean;
}

export function PayoutActions({
  payoutId: _payoutId,
  currentStatus,
  amountCents: _amountCents,
  heldFundsBalanceCents: _heldFundsBalanceCents,
  onEdit,
  onDelete,
  isDemoMode,
  isPlanner,
  isLocked = false,
}: PayoutActionsProps) {

  return (
    <div className="flex items-center gap-2">
      {isPlanner && (
        <>
          <Button
            onClick={onEdit}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title={isLocked ? "Amount is locked to proposal (unlock to edit)" : "Edit payout"}
            disabled={isLocked}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            onClick={onDelete}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
            title="Delete payout"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
      {isDemoMode && currentStatus === "PENDING" && (
        <span className="text-xs text-slate-500">
          Demo payout release is disabled in guarded MVP.
        </span>
      )}
    </div>
  );
}
