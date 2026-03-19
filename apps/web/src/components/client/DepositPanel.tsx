"use client";

import { useState } from "react";
import { Card, Button, Input, Label } from "@/components/ui";
import { DollarSign, CreditCard, CheckCircle2, XCircle } from "lucide-react";

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

export function DepositPanel({ eventSlug, deposits }: DepositPanelProps) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const formatCurrency = (cents: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  };

  const handleCreateDeposit = async () => {
    setError(null);
    setLoading(true);

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventSlug}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          currency: "USD",
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create deposit");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      
      // TODO: Integrate Stripe Elements here
      // For now, show success message
      alert("Deposit created! Stripe payment form would be integrated here.");
      
      // Reset form
      setAmount("");
      setNotes("");
      setClientSecret(null);
      
      // Reload page to show new deposit
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deposit");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Deposit["status"]) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Refunded
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Deposit Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold">Make a Deposit</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this deposit"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          <Button
            onClick={handleCreateDeposit}
            disabled={loading || !amount}
            className="w-full"
          >
            {loading ? "Processing..." : "Create Deposit"}
          </Button>

          {clientSecret && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              Payment form would be integrated here with Stripe Elements.
            </div>
          )}
        </div>
      </Card>

      {/* Deposit History */}
      {deposits.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold">Deposit History</h3>
          </div>

          <div className="space-y-3">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
                    <div className="text-sm text-slate-500 mt-1">{deposit.notes}</div>
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
