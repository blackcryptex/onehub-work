"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";

interface ContractEditorProps {
  contract: {
    id: string;
    title: string;
    bodyMd: string;
  };
  onCancel: () => void;
  onSave?: () => void;
}

export function ContractEditor({
  contract,
  onCancel,
  onSave,
}: ContractEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(contract.title);
  const [bodyMd, setBodyMd] = useState(contract.bodyMd);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyMd,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update contract");
      }

      if (onSave) {
        onSave();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Error updating contract:", err);
      setError(err instanceof Error ? err.message : "Failed to update contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Contract</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onCancel}
            variant="secondary"
            disabled={loading}
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
          <p className="text-sm text-rose-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contract title"
          />
        </div>

        <div>
          <Label htmlFor="bodyMd">Contract Body (Markdown)</Label>
          <textarea
            id="bodyMd"
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            placeholder="Contract content in markdown format"
            className="w-full min-h-[500px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            rows={30}
          />
          <p className="text-xs text-slate-500 mt-1">
            Contract content in markdown format. Use # for headings, ** for bold, etc.
          </p>
        </div>
      </div>
    </div>
  );
}

