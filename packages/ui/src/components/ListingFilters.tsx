import * as React from "react";

export function ListingFilters({ onFilterChange }: { onFilterChange?: (filters: any) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Filters</div>
      <div className="text-xs text-slate-500">Filter options coming soon</div>
    </div>
  );
}
