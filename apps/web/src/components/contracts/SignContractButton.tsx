"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Pen } from "lucide-react";

interface SignContractButtonProps {
  contractId: string;
  onSigned?: () => void;
  disabled?: boolean;
}

export function SignContractButton({
  contractId,
  onSigned,
  disabled = false,
}: SignContractButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const handleSign = async () => {
    if (!contractId) {
      setError("Contract ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign contract");
      }

      const result = await response.json();
      setSigned(true);

      if (onSigned) {
        onSigned();
      } else {
        // Reload page to show updated signatures
        window.location.reload();
      }
    } catch (err) {
      console.error("Error signing contract:", err);
      setError(err instanceof Error ? err.message : "Failed to sign contract");
    } finally {
      setLoading(false);
    }
  };

  if (signed) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <span className="text-sm font-medium">✓ Signed</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSign}
        disabled={loading || disabled}
        className="flex items-center gap-2"
      >
        <Pen className="w-4 h-4" />
        {loading ? "Signing..." : "Sign Contract"}
      </Button>
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

