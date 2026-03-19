import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-soft ${className}`} {...props} />
  );
}
