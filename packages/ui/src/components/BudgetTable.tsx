import * as React from "react";

export type BudgetLine = { id: string; category: string; label: string; plannedCents: number; actualCents: number };

export function BudgetTable({ lines }: { lines: BudgetLine[] }) {
  const totals = lines.reduce((acc, l) => { acc.planned += l.plannedCents; acc.actual += l.actualCents; return acc; }, { planned: 0, actual: 0 });
  const variance = totals.actual - totals.planned;
  const toUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Label</th>
            <th className="px-3 py-2">Planned</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Variance</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="px-3 py-2">{l.category}</td>
              <td className="px-3 py-2">{l.label}</td>
              <td className="px-3 py-2">{toUSD(l.plannedCents)}</td>
              <td className="px-3 py-2">{toUSD(l.actualCents)}</td>
              <td className="px-3 py-2">{toUSD(l.actualCents - l.plannedCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="px-3 py-2" colSpan={2}>Totals</td>
            <td className="px-3 py-2">{toUSD(totals.planned)}</td>
            <td className="px-3 py-2">{toUSD(totals.actual)}</td>
            <td className="px-3 py-2">{toUSD(variance)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
