import * as React from "react";

export function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        if (i < full) return <span key={i} className="text-amber-400">★</span>;
        if (i === full && hasHalf) return <span key={i} className="text-amber-400">☆</span>;
        return <span key={i} className="text-slate-300">☆</span>;
      })}
      <span className="ml-1 text-sm text-slate-600">{rating.toFixed(1)}</span>
    </span>
  );
}

