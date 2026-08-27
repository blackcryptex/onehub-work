import { Card } from "./Card";

export function ListingCard({
  title,
  city,
  state,
  ratingAvg,
  ratingCount,
  priceTier,
  typeLabel,
  categoryLabel,
  verificationLabel,
  verificationDescription,
  availabilityLabel,
  responseLabel,
  contractReadinessLabel,
  startingPriceLabel,
  ctaLabel,
}: {
  title: string;
  city?: string | null;
  state?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
  priceTier?: number | null;
  typeLabel?: string;
  categoryLabel?: string;
  verificationLabel?: string;
  verificationDescription?: string;
  availabilityLabel?: string;
  responseLabel?: string;
  contractReadinessLabel?: string;
  startingPriceLabel?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className="h-full p-4 transition hover:border-indigo-200 hover:shadow-sm">
      <div className="space-y-3">
        <div>
          <div className="font-semibold text-slate-950">{title}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
            {typeLabel ? <span>{typeLabel}</span> : null}
            {categoryLabel ? <span>• {categoryLabel}</span> : null}
          </div>
          {city ? <div className="mt-1 text-sm text-slate-600">{city}{state ? `, ${state}` : ""}</div> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {verificationLabel ? (
            <span title={verificationDescription} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
              {verificationLabel}
            </span>
          ) : null}
          {availabilityLabel ? (
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
              {availabilityLabel}
            </span>
          ) : null}
        </div>

        <div className="grid gap-1 text-sm text-slate-700">
          {startingPriceLabel ? <div>{startingPriceLabel}</div> : priceTier ? <div>{"$".repeat(priceTier)} price tier</div> : null}
          {ratingAvg && ratingAvg > 0 ? <div>⭐ {ratingAvg.toFixed(1)} ({ratingCount ?? 0} reviews)</div> : <div>No reviews yet</div>}
          {responseLabel ? <div>{responseLabel}</div> : null}
          {contractReadinessLabel ? <div className="text-xs text-slate-500">{contractReadinessLabel}</div> : null}
        </div>

        {ctaLabel ? <div className="text-sm font-medium text-indigo-700">{ctaLabel}</div> : null}
      </div>
    </Card>
  );
}

