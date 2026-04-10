"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

interface AddToShortlistButtonClientProps {
  eventId: string;
  listingId: string;
  className?: string;
}

export function AddToShortlistButtonClient({
  eventId,
  listingId,
  className,
}: AddToShortlistButtonClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadShortlistState = async () => {
      try {
        const response = await fetch(`/api/shortlist?eventId=${encodeURIComponent(eventId)}`);
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setAdded(items.some((item: { listingId?: string | null }) => item.listingId === listingId));
        }
      } catch {
        // Leave button in default state if shortlist state cannot be fetched.
      }
    };

    loadShortlistState();
    return () => {
      cancelled = true;
    };
  }, [eventId, listingId]);

  const handleAdd = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, listingId, checked: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to add to shortlist" }));
        throw new Error(data.error || "Failed to add to shortlist");
      }

      setAdded(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to shortlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={added ? "secondary" : "default"}
        onClick={handleAdd}
        disabled={loading || added}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : added ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Added to shortlist
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add to shortlist
          </>
        )}
      </Button>
      {added ? (
        <p className="text-xs text-indigo-700">Next: Request booking for this event.</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
