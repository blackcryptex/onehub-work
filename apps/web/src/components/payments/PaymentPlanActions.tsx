"use client";

import { Button } from "@/components/ui";
import { Pencil, Trash2 } from "lucide-react";

interface DepositActionsProps {
  currentStatus: string;
  onEdit: () => void;
  onDelete: () => void;
  isPlanner: boolean;
}

export function DepositActions({
  currentStatus: _currentStatus,
  onEdit,
  onDelete,
  isPlanner,
}: DepositActionsProps) {
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
  isPlanner: boolean;
  isLocked?: boolean;
}

export function PayoutActions({
  payoutId: _payoutId,
  currentStatus: _currentStatus,
  amountCents: _amountCents,
  heldFundsBalanceCents: _heldFundsBalanceCents,
  onEdit,
  onDelete,
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
    </div>
  );
}
