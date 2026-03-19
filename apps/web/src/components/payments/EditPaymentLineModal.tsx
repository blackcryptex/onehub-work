"use client";

import { useState, useEffect } from "react";
import { Button, Input, Label } from "@/components/ui";
import { X, Loader2 } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  category: string;
  type: string;
}

interface EditPaymentLineModalProps {
  open: boolean;
  onClose: () => void;
  line: {
    id?: string;
    label?: string;
    amountCents?: number;
    payeeListingId?: string | null;
  } | null;
  mode: "deposit" | "payout";
  payees: Listing[];
  onSaved: () => void;
  eventId: string;
  proposalId: string;
  orgId: string;
}

export function EditPaymentLineModal({
  open,
  onClose,
  line,
  mode,
  payees,
  onSaved,
  eventId,
  proposalId,
  orgId,
}: EditPaymentLineModalProps) {
  const [label, setLabel] = useState(line?.label || "");
  const [amountDollars, setAmountDollars] = useState(
    line?.amountCents ? (line.amountCents / 100).toString() : ""
  );
  const [payeeId, setPayeeId] = useState(line?.payeeListingId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (line) {
      setLabel(line.label || "");
      setAmountDollars(line.amountCents ? (line.amountCents / 100).toString() : "");
      setPayeeId(line.payeeListingId || "");
    } else {
      setLabel("");
      setAmountDollars("");
      setPayeeId("");
    }
    setError(null);
  }, [line, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (mode === "deposit" && !label.trim()) {
      setError("Label is required");
      return;
    }

    const amountCents = Math.round(parseFloat(amountDollars) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (mode === "payout" && !payeeId && !line?.id) {
      // Allow saving existing payout without payee (for locked payouts)
      setError("Please select a payee");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = line?.id
        ? `/api/payments/lines/${line.id}`
        : `/api/payments/lines`;

      const method = line?.id ? "PATCH" : "POST";

      const body = {
        mode,
        label,
        amountCents,
        payeeListingId: mode === "payout" ? payeeId : undefined,
        eventId,
        proposalId,
        orgId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save payment line");
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving payment line:", err);
      setError(err instanceof Error ? err.message : "Failed to save payment line");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {line?.id ? "Edit" : "Add"} {mode === "deposit" ? "Deposit" : "Payout Line"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 border border-rose-200 p-3 mb-4">
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="label">
              {mode === "deposit" ? "Deposit Label" : "Payout Label"}
            </Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={mode === "deposit" ? "e.g., Deposit 1, Final Payment" : "e.g., Venue Payment, Catering Deposit"}
            />
          </div>

          {mode === "payout" && (
            <div>
              <Label htmlFor="payee">Payee (Vendor/Venue)</Label>
              <select
                id="payee"
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a vendor/venue...</option>
                {payees.map((payee) => (
                  <option key={payee.id} value={payee.id}>
                    {payee.title} ({payee.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

