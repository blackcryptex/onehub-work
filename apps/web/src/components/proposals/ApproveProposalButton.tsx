"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { CURRENT_ACCEPTANCE_VERSIONS } from "@/lib/acceptance-versions";

interface ApproveProposalButtonProps {
  proposalId: string;
  onSuccess?: () => void;
}

export function ApproveProposalButton({
  proposalId,
  onSuccess,
}: ApproveProposalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!proposalId) {
      setError("Proposal ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptance: {
            accepted: true,
            legalVersion: CURRENT_ACCEPTANCE_VERSIONS.proposal,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = data.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("[UI] Proposal approval failed:", errorMessage);
        throw new Error(errorMessage);
      }

      const proposal = await response.json();
      console.log("[UI] Proposal approved successfully:", proposal.id);

      if (onSuccess) {
        onSuccess();
      } else {
        // Refresh the page to show updated status
        router.refresh();
      }
    } catch (err) {
      console.error("[UI] Error approving proposal:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to approve proposal";
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
        onClick={handleApprove}
        disabled={loading || !accepted}
        className="flex items-center gap-2"
        variant="default"
      >
        <CheckCircle2 className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
        {loading ? "Approving..." : "Approve Proposal"}
      </Button>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>I accept this proposal and the commercial terms shown above.</span>
      </label>
      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-2">
          <p className="text-sm text-rose-800 font-medium">Error approving proposal</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
