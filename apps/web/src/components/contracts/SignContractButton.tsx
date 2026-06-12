"use client";

import { Button } from "@/components/ui";
import { Pen } from "lucide-react";

interface SignContractButtonProps {
  contractId: string;
  onSigned?: () => void;
  disabled?: boolean;
}

/**
 * Deprecated legacy one-click signer.
 * Product signing must use ContractSignatureForm so signer identity and legal acceptance proof
 * are submitted to POST /api/contracts/[id]/sign.
 */
export function SignContractButton({ disabled = false }: SignContractButtonProps) {
  return (
    <div className="space-y-2">
      <Button disabled className="flex items-center gap-2" title="Use the canonical contract signature form">
        <Pen className="w-4 h-4" />
        Sign in canonical form
      </Button>
      {!disabled && (
        <p className="text-sm text-amber-700">
          Legacy one-click signing is disabled. Use the contract signature form to provide signer identity and legal acceptance.
        </p>
      )}
    </div>
  );
}
