"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { DollarSign, CheckCircle2, Loader2, Pencil, Trash2 } from "lucide-react";

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
  escrowBalanceCents: number;
  onEdit: () => void;
  onDelete: () => void;
  isDemoMode: boolean;
  isPlanner: boolean;
  isLocked?: boolean;
}

export function PayoutActions({
  payoutId,
  currentStatus,
  amountCents,
  escrowBalanceCents,
  onEdit,
  onDelete,
  isDemoMode,
  isPlanner,
  isLocked = false,
}: PayoutActionsProps) {
  const [releasing, setReleasing] = useState(false);
  const router = useRouter();

  const handleRelease = async () => {
    if (!isDemoMode || currentStatus !== "PENDING") return;

    if (escrowBalanceCents < amountCents) {
      alert("Insufficient escrow balance to release this payout");
      return;
    }

    setReleasing(true);
    try {
      const response = await fetch(`/api/demo/payouts/${payoutId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to release payout");
      }

      router.refresh();
    } catch (err) {
      console.error("Error releasing payout:", err);
      alert(err instanceof Error ? err.message : "Failed to release payout");
    } finally {
      setReleasing(false);
    }
  };

  const canRelease = isDemoMode && currentStatus === "PENDING" && escrowBalanceCents >= amountCents;

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
      {canRelease && (
        <Button
          onClick={handleRelease}
          disabled={releasing}
          size="sm"
          variant="secondary"
          className="flex items-center gap-1"
        >
          {releasing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Releasing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Release
            </>
          )}
        </Button>
      )}
      {isDemoMode && currentStatus === "PENDING" && escrowBalanceCents < amountCents && (
        <span className="text-xs text-amber-600">Insufficient escrow</span>
      )}
    </div>
  );
}

