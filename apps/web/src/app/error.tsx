"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
import Link from "next/link";
import { trackError } from "@/lib/errorTracker";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Track error for monitoring/alerting
    trackError(error, {
      route: "error-boundary",
      errorId: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-rose-600">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-500">Error ID: {error.digest}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button onClick={reset}>
            Try again
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

