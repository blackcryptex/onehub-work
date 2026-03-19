"use client";

import { useEffect } from "react";
import { trackError } from "@/lib/errorTracker";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Track critical error for monitoring/alerting
    trackError(error, {
      route: "global-error-boundary",
      errorId: error.digest,
    });
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ color: "#dc2626", fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
            Application Error
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1rem" }}>
            A critical error occurred. Please refresh the page or contact support if the problem persists.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              backgroundColor: "#4f46e5",
              color: "white",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

