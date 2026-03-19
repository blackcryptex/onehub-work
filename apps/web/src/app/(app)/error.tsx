"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-rose-600">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-500">Error ID: {error.digest}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" asChild>
            <Link href="/app">Go to dashboard</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

