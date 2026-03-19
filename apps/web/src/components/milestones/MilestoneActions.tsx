"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface MilestoneActionsProps {
  milestoneId: string;
  status: string;
  demoModeActive: boolean;
}

export function MilestoneActions({
  milestoneId,
  status,
  demoModeActive,
}: MilestoneActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleFund = async () => {
    setLoading("fund");
    try {
      const response = await fetch(`/api/demo/milestones/${milestoneId}/fund`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fund milestone");
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Error funding milestone:", error);
      alert(error instanceof Error ? error.message : "Failed to fund milestone");
    } finally {
      setLoading(null);
    }
  };

  const handleRelease = async () => {
    setLoading("release");
    try {
      const response = await fetch(
        `/api/demo/milestones/${milestoneId}/release`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to release milestone");
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Error releasing milestone:", error);
      alert(
        error instanceof Error ? error.message : "Failed to release milestone"
      );
    } finally {
      setLoading(null);
    }
  };

  if (!demoModeActive) {
    return (
      <p className="text-xs text-slate-500">
        Stripe Connect escrow coming next
      </p>
    );
  }

  if (status === "PENDING") {
    return (
      <Button
        onClick={handleFund}
        disabled={loading === "fund"}
        size="sm"
        variant="default"
      >
        {loading === "fund" ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Funding...
          </>
        ) : (
          "Fund (Client)"
        )}
      </Button>
    );
  }

  if (status === "IN_ESCROW") {
    return (
      <Button
        onClick={handleRelease}
        disabled={loading === "release"}
        size="sm"
        variant="default"
      >
        {loading === "release" ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Releasing...
          </>
        ) : (
          "Release (Escrow → Vendor)"
        )}
      </Button>
    );
  }

  return null;
}

