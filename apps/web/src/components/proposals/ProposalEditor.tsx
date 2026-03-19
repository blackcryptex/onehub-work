"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";

interface ProposalEditorProps {
  proposal: {
    id: string;
    title: string;
    summary: string | null;
    terms: string | null;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  };
  onCancel: () => void;
  onSave?: () => void;
}

export function ProposalEditor({
  proposal,
  onCancel,
  onSave,
}: ProposalEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(proposal.title);
  const [summary, setSummary] = useState(proposal.summary || "");
  const [terms, setTerms] = useState(proposal.terms || "");
  const [subtotalCents, setSubtotalCents] = useState(proposal.subtotalCents);
  const [taxCents, setTaxCents] = useState(proposal.taxCents);
  const [totalCents, setTotalCents] = useState(proposal.totalCents);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary: summary || null,
          terms: terms || null,
          subtotalCents,
          taxCents,
          totalCents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update proposal");
      }

      if (onSave) {
        onSave();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Error updating proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to update proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Proposal</h2>
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
            placeholder="Proposal title"
          />
        </div>

        <div>
          <Label htmlFor="summary">Summary</Label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Proposal summary"
            className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
          />
        </div>

        <div>
          <Label htmlFor="terms">Terms & Conditions</Label>
          <textarea
            id="terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Terms and conditions"
            className="w-full min-h-[150px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={6}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="subtotal">Subtotal (cents)</Label>
            <Input
              id="subtotal"
              type="number"
              value={subtotalCents}
              onChange={(e) => setSubtotalCents(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-slate-500 mt-1">
              ${(subtotalCents / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <Label htmlFor="tax">Tax (cents)</Label>
            <Input
              id="tax"
              type="number"
              value={taxCents}
              onChange={(e) => setTaxCents(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-slate-500 mt-1">
              ${(taxCents / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <Label htmlFor="total">Total (cents)</Label>
            <Input
              id="total"
              type="number"
              value={totalCents}
              onChange={(e) => setTotalCents(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-slate-500 mt-1">
              ${(totalCents / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

