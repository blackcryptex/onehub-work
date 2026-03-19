import * as React from "react";

export function Money({ cents, currency = "USD" }: { cents: number; currency?: string }) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
  return <span>{formatter.format(cents / 100)}</span>;
}

