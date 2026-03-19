import * as React from "react";
import { Card } from "./Card";

export function ListingCard({ title, city, ratingAvg, priceTier }: { title: string; city?: string | null; ratingAvg?: number; priceTier?: number | null }) {
  return (
    <Card className="p-4">
      <div className="font-semibold">{title}</div>
      {city && <div className="text-sm text-slate-600">{city}</div>}
      {ratingAvg && ratingAvg > 0 && <div className="text-sm">⭐ {ratingAvg.toFixed(1)}</div>}
      {priceTier && <div className="text-sm text-slate-600">{"$".repeat(priceTier)}</div>}
    </Card>
  );
}

