"use client";

import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth section error:", error);
  }, [error]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Authentication Error</h2>
      <p>{error?.message ?? "An unexpected error occurred in this section."}</p>
      <button onClick={() => reset()}>Retry</button>
    </div>
  );
}

