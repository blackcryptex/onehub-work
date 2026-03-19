import * as React from "react";
import { Money } from "./Money";

export function TotalsSummary({ subtotalCents, taxCents = 0, totalCents, currency = "USD" }: { subtotalCents: number; taxCents?: number; totalCents: number; currency?: string }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <Money cents={subtotalCents} currency={currency} />
      </div>
      {taxCents > 0 && (
        <div className="flex justify-between">
          <span>Tax</span>
          <Money cents={taxCents} currency={currency} />
        </div>
      )}
      <div className="flex justify-between border-t pt-2 font-semibold">
        <span>Total</span>
        <Money cents={totalCents} currency={currency} />
      </div>
    </div>
  );
}

