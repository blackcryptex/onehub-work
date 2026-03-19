"use client";

import * as React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", ...props }, ref) => {
    const base = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";
    return <select ref={ref} className={`${base} ${className}`} {...props} />;
  }
);
Select.displayName = "Select";

