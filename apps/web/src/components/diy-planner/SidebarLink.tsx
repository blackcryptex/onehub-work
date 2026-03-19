"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type Props = {
  href: string | Route;
  label: string;
  Icon: LucideIcon;
  onClick?: () => void;
};

export default function SidebarLink({ href, label, Icon, onClick }: Props) {
  const pathname = usePathname();
  const active = href !== "#" && pathname === href;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick();
    }
    if (href === "#") {
      e.preventDefault();
    }
  };

  return (
    <Link
      href={href as Route}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        "text-slate-200 hover:bg-white/10 hover:text-white",
        active && "bg-white/10 text-white border-l-4 border-[color:var(--oh-primary)]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

