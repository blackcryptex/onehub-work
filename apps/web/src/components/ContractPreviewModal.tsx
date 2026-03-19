'use client';

import { Contract } from '@/lib/types.event';
import { X } from 'lucide-react';

interface ContractPreviewModalProps {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onMarkPreviewed: () => void;
}

export default function ContractPreviewModal({ contract, isOpen, onClose, onMarkPreviewed }: ContractPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Contract Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Contract with {contract.counterparty}</h3>
            <p className="text-sm text-slate-600">Status: <span className="capitalize">{contract.status}</span></p>
            {contract.value && (
              <p className="text-sm text-slate-600 mt-1">Value: ${contract.value.toLocaleString()}</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-3">Clauses</h4>
            <div className="space-y-4">
              {contract.clauses.map((clause) => (
                <div key={clause.id} className="border rounded-lg p-4">
                  <h5 className="font-semibold mb-2">{clause.title}</h5>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{clause.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => {
                onMarkPreviewed();
                onClose();
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-[color:var(--oh-primary)] text-white hover:bg-[color:var(--oh-primary-700)]"
            >
              I’ve Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

