import * as React from "react";

export interface AIHint {
  id: string;
  type: "checklist" | "vendor" | "message";
  title: string;
  description: string;
  action?: () => void;
}

export function AIHintsPanel({ hints }: { hints: AIHint[] }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">AI Suggestions</h3>
      {hints.map((hint) => (
        <div key={hint.id} className="p-3 bg-slate-50 rounded">
          <div className="font-medium text-sm">{hint.title}</div>
          <div className="text-xs text-slate-600 mt-1">{hint.description}</div>
          {hint.action && (
            <button className="mt-2 text-xs text-blue-600 hover:underline" onClick={hint.action}>
              Apply
            </button>
          )}
        </div>
      ))}
      {hints.length === 0 && <div className="text-sm text-slate-500">No suggestions at this time.</div>}
    </div>
  );
}
