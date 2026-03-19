"use client";

import { useState, useEffect } from "react";
import { Button } from "@onehub/ui";
import { formatCurrency } from "@/lib/types.payment";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountCents: number;
  currency: string;
  milestoneLabel?: string;
  onSuccess: () => void;
  paymentIntentId?: string;
  clientSecret?: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  amountCents,
  currency,
  milestoneLabel,
  onSuccess,
  paymentIntentId,
  clientSecret,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCardName("");
      setBillingAddress("");
      setBillingCity("");
      setBillingState("");
      setBillingZip("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-click protection: prevent concurrent submissions
    if (isProcessing || loading) return;
    
    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      if (!paymentIntentId) {
        setError("Payment intent not initialized");
        setLoading(false);
        setIsProcessing(false);
        return;
      }

      // TODO: Integrate with Stripe Elements for secure card processing
      // For now, this is a placeholder that simulates payment confirmation
      // In production, use Stripe.js and Elements to securely collect card details

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Confirm payment with backend
      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Payment failed");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600">Amount</div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(amountCents, currency)}
          </div>
          {milestoneLabel && (
            <div className="text-sm text-slate-600 mt-1">Milestone: {milestoneLabel}</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry
              </label>
              <input
                type="text"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                placeholder="MM/YY"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CVC
              </label>
              <input
                type="text"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                placeholder="123"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
              disabled={loading}
            />
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Billing Address</div>
            <div className="space-y-3">
              <input
                type="text"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={loading}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={billingCity}
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="City"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={billingState}
                  onChange={(e) => setBillingState(e.target.value)}
                  placeholder="State"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>
              <input
                type="text"
                value={billingZip}
                onChange={(e) => setBillingZip(e.target.value)}
                placeholder="ZIP code"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isProcessing}
              className="flex-1"
            >
              {loading || isProcessing ? "Processing..." : `Pay ${formatCurrency(amountCents, currency)}`}
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            🔒 Your payment is secure. Funds will be held in escrow until the milestone is completed.
          </p>
        </form>
      </div>
    </div>
  );
}

