"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteProposalButtonProps {
  proposalId: string;
}

export function DeleteProposalButton({ proposalId }: DeleteProposalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this proposal? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete proposal");
      }

      // Redirect to event vault or proposals list
      router.push("/proposals");
      router.refresh();
    } catch (err) {
      console.error("Error deleting proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to delete proposal");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleDelete}
        disabled={loading}
        variant="secondary"
        size="sm"
        className="text-rose-600 hover:text-rose-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </>
        )}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}

