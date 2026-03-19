"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function SidebarSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="select-none">
      <button
        className={cn(
          "w-full flex items-center justify-between text-left text-slate-300",
          "px-2 py-2 rounded-lg hover:bg-white/5"
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-0" : "-rotate-90")} />
      </button>
      <div className={cn("mt-2 space-y-1 pl-1", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}

