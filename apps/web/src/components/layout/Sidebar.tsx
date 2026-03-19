"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Role } from "@onehub/types/src/roles";
import type { Route } from "next";

function itemsForRole(role: Role | undefined) {
  switch (role) {
    case "DIY_PLANNER":
      return [
        { href: "/diy-planner", label: "Dashboard" },
        { href: "/diy-planner/vault", label: "Event Vault" },
      ];
    case "PRO_PLANNER":
      return [
        { href: "/pro/planner", label: "Dashboard" },
        { href: "/pro/planner/vault", label: "Event Vault" },
      ];
    case "VENDOR":
      return [
        { href: "/app", label: "Dashboard" },
        { href: "/app/vault", label: "Event Vault" },
        { href: "/app/marketplace/manage", label: "Listings" },
      ];
    case "VENUE":
      return [
        { href: "/app", label: "Dashboard" },
        { href: "/app/vault", label: "Event Vault" },
        { href: "/app/marketplace/manage", label: "Availability" },
      ];
    case "ADMIN":
      return [
        { href: "/app", label: "Dashboard" },
        { href: "/app/admin/overview", label: "Admin" },
      ];
    default:
      return [{ href: "/app", label: "Dashboard" }];
  }
}

export function Sidebar() {
  const { data } = useSession();
  const pathname = usePathname();
  const items = useMemo(() => itemsForRole(data?.user?.role), [data?.user?.role]);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-3 md:block">
      <nav aria-label="Sidebar navigation" className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`flex items-center rounded-xl px-3 py-2 text-sm ${
                active ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
