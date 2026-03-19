"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UIRoute = "overview" | "services" | "availability" | "payments" | "portfolio" | "settings";

type Props = {
  currentRoute: UIRoute;
  onRoute: (route: UIRoute) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
};

export function ProPlannerSidebar({
  currentRoute,
  onRoute,
  mobileOpen,
  setMobileOpen,
}: Props) {
  const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);
  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;
  const setIsMobileOpen = setMobileOpen !== undefined ? setMobileOpen : setInternalMobileOpen;

  const navItems = [
    { route: "overview" as UIRoute, label: "Overview", icon: LayoutDashboard },
    { route: "services" as UIRoute, label: "Services", icon: Briefcase },
    { route: "availability" as UIRoute, label: "Availability", icon: Calendar },
    { route: "payments" as UIRoute, label: "Payments", icon: DollarSign },
    { route: "portfolio" as UIRoute, label: "Portfolio", icon: ImageIcon },
    { route: "settings" as UIRoute, label: "Settings", icon: Settings },
  ];

  const nav = (
    <nav className="h-full w-72 shrink-0 bg-[color:var(--oh-sidebar)] text-white p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="space-y-1">
        <div className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dashboard</div>
        {navItems.map((item) => {
          const active = currentRoute === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.route}
              onClick={() => {
                onRoute(item.route);
                setIsMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                "bg-white/0 hover:bg-white/10 text-slate-200",
                active && "bg-white/10 border-l-4 border-[color:var(--oh-primary)]"
              )}
              aria-current={active ? "true" : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-[100dvh]">{nav}</div>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[color:var(--oh-sidebar)] shadow-2xl">
            <div className="p-2 flex items-center justify-between">
              <span className="text-slate-300 text-sm font-semibold">Menu</span>
              <button
                className="text-slate-300 hover:text-white p-2"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

