import * as React from "react";

type Step = { key: string; label: string };

export function Stepper({ steps, active }: { steps: Step[]; active: string }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((s, i) => {
        const isActive = s.key === active;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"}`}>{i + 1}</span>
            <span className={isActive ? "font-semibold" : "text-slate-600"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
