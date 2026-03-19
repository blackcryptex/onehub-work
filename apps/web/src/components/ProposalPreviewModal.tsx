'use client';

import { Proposal } from '@/lib/types.event';
import { X } from 'lucide-react';

interface ProposalPreviewModalProps {
  proposal: Proposal;
  isOpen: boolean;
  onClose: () => void;
  onMarkPreviewed: () => void;
}

export default function ProposalPreviewModal({ proposal, isOpen, onClose, onMarkPreviewed }: ProposalPreviewModalProps) {
  if (!isOpen) return null;

  const total = proposal.lines.reduce((sum, line) => sum + (line.total ?? (line.qty ?? 0) * (line.unitPrice ?? 0)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Proposal Preview</h2>
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
            <h3 className="text-lg font-semibold mb-2">{proposal.vendorName || 'Unassigned Vendor'}</h3>
            <p className="text-sm text-slate-600">Status: <span className="capitalize">{proposal.status}</span></p>
          </div>

          {proposal.notes && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700">{proposal.notes}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-3">Line Items</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {proposal.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2">{line.title}</td>
                    <td className="py-2 text-right">{line.qty ?? 1}</td>
                    <td className="py-2 text-right">${(line.unitPrice ?? 0).toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">${(line.total ?? (line.qty ?? 0) * (line.unitPrice ?? 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td colSpan={3} className="py-3 text-right">Total:</td>
                  <td className="py-3 text-right">${total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
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

