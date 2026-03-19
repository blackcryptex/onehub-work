"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number; // default 3500
};

type ToastContextValue = {
  toasts: Toast[];
  show: (t: Omit<Toast, "id">) => string; // returns id
  dismiss: (id: string) => void;
  success: (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => void;
  error: (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => void;
  info: (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const toast: Toast = { id, durationMs: 3500, ...t };
      setToasts((prev) => [...prev, toast]);
      // auto dismiss
      const timeout = toast.durationMs ?? 3500;
      if (timeout > 0) setTimeout(() => dismiss(id), timeout);
      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => {
      show({ message, variant: "success", ...opts });
    },
    [show]
  );

  const error = useCallback(
    (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => {
      show({ message, variant: "error", ...opts });
    },
    [show]
  );

  const info = useCallback(
    (message: string, opts?: Partial<Omit<Toast, "id" | "message" | "variant">>) => {
      show({ message, variant: "info", ...opts });
    },
    [show]
  );

  const value = useMemo(
    () => ({ toasts, show, dismiss, success, error, info }),
    [toasts, show, dismiss, success, error, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={dismiss} />
    </ToastContext.Provider>
  );
}

// Simple Toast container (JSX requires .tsx)
export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "min-w-[240px] max-w-sm rounded-xl px-4 py-3 shadow-lg border bg-white",
            toast.variant === "success" && "border-green-300",
            toast.variant === "error" && "border-red-300",
            toast.variant === "warning" && "border-amber-300",
            toast.variant === "info" && "border-blue-300",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
          aria-live="polite"
        >
          {toast.title && <div className="text-sm font-semibold mb-0.5">{toast.title}</div>}
          <div className="text-sm text-slate-700">{toast.message}</div>
          <div className="mt-2 flex justify-end">
            <button
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss toast"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

