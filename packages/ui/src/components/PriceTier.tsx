import * as React from "react";

export function PriceTier({ tier }: { tier: number | null | undefined }) {
  if (!tier) return null;
  return <span className="text-sm">{"$".repeat(tier)}</span>;
}

