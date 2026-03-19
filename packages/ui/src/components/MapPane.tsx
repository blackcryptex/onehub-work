"use client";

import * as React from "react";

export function MapPane({ listings }: { listings: Array<{ id: string; title: string; latitude?: number | null; longitude?: number | null }> }) {
  // Placeholder for map integration (leaflet/maplibre)
  return (
    <div className="h-64 w-full rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center text-sm text-slate-600">
      Map view ({listings.length} listings)
      {/* Map integration would go here with env-gated token */}
    </div>
  );
}

