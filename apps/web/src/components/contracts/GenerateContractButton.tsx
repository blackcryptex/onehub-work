"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

interface GenerateContractButtonProps {
  proposalId: string;
  onSuccess?: (contractId: string) => void;
}

export function GenerateContractButton({
  proposalId,
  onSuccess,
}: GenerateContractButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!proposalId) {
      setError("Proposal ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contracts/from-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate contract");
      }

      const contract = await response.json();

      if (onSuccess) {
        onSuccess(contract.id);
      } else {
        // Navigate to contract page
        router.push(`/app/contracts/${contract.id}` as any);
      }
    } catch (err) {
      console.error("Error generating contract:", err);
      setError(err instanceof Error ? err.message : "Failed to generate contract");
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
      >
        <FileText className="w-4 h-4" />
        {loading ? "Generating..." : "Generate Contract"}
      </Button>
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

