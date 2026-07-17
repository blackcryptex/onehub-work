"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";

type StripePaymentElement = {
  mount: (element: HTMLElement) => void;
  destroy: () => void;
};

type StripeElements = {
  create: (type: "payment") => StripePaymentElement;
};

type StripeInstance = {
  elements: (options: { clientSecret: string }) => StripeElements;
  confirmPayment: (options: {
    elements: StripeElements;
    redirect: "if_required";
    confirmParams: Record<string, never>;
  }) => Promise<{ error?: { message?: string } }>;
};

type StripeConstructor = (publishableKey: string) => StripeInstance;

declare global {
  interface Window {
    Stripe?: StripeConstructor;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountCents: number;
  currency: string;
  milestoneLabel?: string;
  paymentIntentId: string;
  clientSecret: string;
  onSuccess?: () => void;
}

type PaymentUiState =
  | "idle"
  | "awaiting-payment-input"
  | "processing"
  | "failed"
  | "submitted";

async function confirmPaymentPersistence(paymentIntentId: string) {
  const response = await fetch("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to confirm payment receipt.");
  }

  if (data?.success) {
    return data;
  }

  if (data?.status === "processing") {
    throw new Error(data?.message || "Payment is still processing. Please wait a moment and try again.");
  }

  throw new Error(data?.message || "Failed to confirm payment receipt.");
}

const STRIPE_JS_SRC = "https://js.stripe.com/v3/";

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

async function loadStripeJs(): Promise<StripeConstructor | null | undefined> {
  if (typeof window === "undefined") return null;
  if (window.Stripe) return window.Stripe;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${STRIPE_JS_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Stripe.js")), { once: true });
      if (window.Stripe) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = STRIPE_JS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Stripe.js"));
    document.head.appendChild(script);
  });

  return window.Stripe;
}

export function PaymentModal({
  isOpen,
  onClose,
  amountCents,
  currency,
  milestoneLabel,
  paymentIntentId,
  clientSecret,
  onSuccess,
}: PaymentModalProps) {
  const [uiState, setUiState] = useState<PaymentUiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(clientSecret ?? null);
  const [internalPaymentIntentId, setInternalPaymentIntentId] = useState<string | null>(paymentIntentId ?? null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<StripeInstance | null>(null);
  const [elementsInstance, setElementsInstance] = useState<StripeElements | null>(null);
  const paymentElementRef = useRef<HTMLDivElement | null>(null);
  const mountedElementRef = useRef<StripePaymentElement | null>(null);

  const amountLabel = useMemo(() => formatMoney(amountCents, currency), [amountCents, currency]);

  useEffect(() => {
    if (!isOpen) return;
    setPaymentIntentClientSecret(clientSecret);
    setInternalPaymentIntentId(paymentIntentId);
    setUiState("awaiting-payment-input");
    setError(null);
  }, [isOpen, clientSecret, paymentIntentId]);

  useEffect(() => {
    if (!isOpen || !paymentIntentClientSecret || !paymentElementRef.current) return;

    let cancelled = false;

    const mountElements = async () => {
      try {
        const mountTarget = paymentElementRef.current;
        if (!mountTarget) return;

        const StripeCtor = await loadStripeJs();
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!StripeCtor || !publishableKey) {
          throw new Error("Stripe is not configured for client payment collection.");
        }

        const stripe = StripeCtor(publishableKey);
        const elements = stripe.elements({ clientSecret: paymentIntentClientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount(mountTarget);

        if (cancelled) {
          paymentElement.destroy();
          return;
        }

        mountedElementRef.current = paymentElement;
        setStripeInstance(stripe);
        setElementsInstance(elements);
        setStripeReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize secure payment form.");
          setUiState("failed");
        }
      }
    };

    mountElements();

    return () => {
      cancelled = true;
      setStripeReady(false);
      if (mountedElementRef.current) {
        mountedElementRef.current.destroy();
        mountedElementRef.current = null;
      }
    };
  }, [isOpen, paymentIntentClientSecret]);

  const handleConfirmPayment = async () => {
    if (!stripeInstance || !elementsInstance) {
      setError("Secure payment form is not ready yet.");
      setUiState("failed");
      return;
    }

    if (!internalPaymentIntentId) {
      setError("Payment intent is missing. Please restart payment.");
      setUiState("failed");
      return;
    }

    setUiState("processing");
    setError(null);

    try {
      const result = await stripeInstance.confirmPayment({
        elements: elementsInstance,
        redirect: "if_required",
        confirmParams: {},
      });

      if (result.error) {
        setError(result.error.message || "Payment could not be submitted.");
        setUiState("failed");
        return;
      }

      await confirmPaymentPersistence(internalPaymentIntentId);

      setUiState("submitted");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm payment receipt.");
      setUiState("failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Secure payment</h2>
            <p className="mt-1 text-sm text-slate-600">
              {milestoneLabel ? `Paying for ${milestoneLabel}` : "Complete payment securely with Stripe."}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Amount due</div>
          <div className="text-2xl font-semibold text-slate-900">{amountLabel}</div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {(uiState === "awaiting-payment-input" || uiState === "processing" || uiState === "failed") ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div ref={paymentElementRef} />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!stripeReady || uiState === "processing" || !internalPaymentIntentId}
              onClick={handleConfirmPayment}
            >
              {uiState === "processing" ? "Processing..." : "Submit payment securely"}
            </Button>
          </div>
        ) : null}

        {uiState === "submitted" ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            Payment received successfully. Held funds have been updated.
          </div>
        ) : null}
      </div>
    </div>
  );
}
