"use client";

import { useState } from "react";
import { Card, Button, Input, Label } from "@/components/ui";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mode";
import { useRouter } from "next/navigation";

interface ContractSignatureFormProps {
  contractId: string;
  onSuccess: () => void;
}

export function ContractSignatureForm({ contractId, onSuccess }: ContractSignatureFormProps) {
  const router = useRouter();
  const demoMode = isDemoMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    signerName: demoMode ? "Jane Planner" : "",
    signerEmail: demoMode ? "pro@example.com" : "",
    agreed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: formData.signerName,
          signerEmail: formData.signerEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign contract");
      }

      onSuccess();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Sign Contract</h3>

      {demoMode && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>DEMO DATA</strong> — Signature will be saved to database (no e-signature service)
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="signerName">Full Name *</Label>
          <Input
            id="signerName"
            value={formData.signerName}
            onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
            required
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <Label htmlFor="signerEmail">Email Address *</Label>
          <Input
            id="signerEmail"
            type="email"
            value={formData.signerEmail}
            onChange={(e) => setFormData({ ...formData, signerEmail: e.target.value })}
            required
            placeholder="Enter your email"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="agreed"
            checked={formData.agreed}
            onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
            required
            className="mt-1"
          />
          <Label htmlFor="agreed" className="text-sm">
            I agree to the terms and conditions of this contract *
          </Label>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || !formData.agreed}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              "Sign Contract"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

