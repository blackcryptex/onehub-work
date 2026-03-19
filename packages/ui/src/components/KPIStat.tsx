import * as React from "react";

export function KPIStat({ label, value, trend }: { label: string; value: string | number; trend?: number }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
