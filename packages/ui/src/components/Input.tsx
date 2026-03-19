"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    const base = "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2";
    return <input ref={ref} className={`${base} ${className}`} {...props} />;
  }
);
Input.displayName = "Input";
