"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

interface GenerateProposalButtonProps {
  eventId: string;
  listingId?: string;
  onSuccess?: (proposalId: string) => void;
}

export function GenerateProposalButton({
  eventId,
  listingId,
  onSuccess,
}: GenerateProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!eventId) {
      setError("Event ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[UI] Generating proposal for event:", eventId, "listing:", listingId);
      
      const response = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, listingId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("[UI] Proposal generation failed:", errorMessage);
        throw new Error(errorMessage);
      }

      const proposal = await response.json();
      console.log("[UI] Proposal generated successfully:", proposal.id, proposal.title);

      if (onSuccess) {
        onSuccess(proposal.id);
      } else {
        // Navigate to proposal page to view the generated proposal
        // Type assertion: Next.js typed routes don't support dynamic template strings, so we cast to satisfy TypeScript
        router.push(`/app/proposals/${proposal.id}` as any);
      }
    } catch (err) {
      console.error("[UI] Error generating proposal:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate proposal";
      setError(errorMessage);
      
      // Show error for a few seconds, then clear it
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2"
        variant={loading ? "secondary" : "default"}
      >
        <Sparkles className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Generating Proposal..." : "Generate AI Proposal"}
      </Button>
      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-2">
          <p className="text-sm text-rose-800 font-medium">Error generating proposal</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <p className="text-xs text-rose-500 mt-1">Check the browser console and server logs for details.</p>
        </div>
      )}
    </div>
  );
}

