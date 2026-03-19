"use client";

import * as React from "react";
import { Money } from "./Money";

type LineItem = { id?: string; label: string; qty: number; unit?: string; unitPriceCents: number; totalCents: number };

export function LineItemsTable({ items, currency = "USD" }: { items: LineItem[]; currency?: string }) {
  const total = items.reduce((sum, li) => sum + li.totalCents, 0);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-600">
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Qty</th>
            <th className="px-3 py-2">Unit Price</th>
            <th className="px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((li, idx) => (
            <tr key={li.id || idx} className="border-t">
              <td className="px-3 py-2">{li.label}</td>
              <td className="px-3 py-2">{li.qty} {li.unit || ""}</td>
              <td className="px-3 py-2"><Money cents={li.unitPriceCents} currency={currency} /></td>
              <td className="px-3 py-2"><Money cents={li.totalCents} currency={currency} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="px-3 py-2" colSpan={3}>Total</td>
            <td className="px-3 py-2"><Money cents={total} currency={currency} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

