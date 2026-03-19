"use client";

import {
  PlusCircle,
  LayoutDashboard,
  FolderOpen,
  Calendar,
  Store,
  FileSignature,
  ScrollText,
  Wallet,
  Users,
  CheckSquare,
  Settings,
  HelpCircle,
  X,
} from "lucide-react";
import SidebarLink from "./SidebarLink";
import SidebarSection from "./SidebarSection";
import { useState } from "react";
import type { EventItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type UIRoute =
  | "overview"
  | "vault"
  | "calendar"
  | "vendors"
  | "proposals"
  | "contracts"
  | "budget"
  | "guests"
  | "tasks"
  | "wizard"
  | "eventDetail";

type Props = {
  events: EventItem[];
  selectedEventId?: string | null;
  onRoute: (route: UIRoute) => void;
  onSelectEvent: (id: string) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
};

export default function DIYSidebar({
  events,
  selectedEventId,
  onRoute,
  onSelectEvent,
  mobileOpen,
  setMobileOpen,
}: Props) {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileOpen = mobileOpen !== undefined ? mobileOpen : internalMobileOpen;
  const setIsMobileOpen = setMobileOpen !== undefined ? setMobileOpen : setInternalMobileOpen;

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  const nav = (
    <nav className="h-full w-72 shrink-0 bg-[color:var(--oh-sidebar)] text-white p-4 flex flex-col gap-4 overflow-y-auto">
      <button
        onClick={() => {
          onRoute("wizard");
          setIsMobileOpen(false);
        }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-[color:var(--oh-primary)] hover:bg-[color:var(--oh-primary-700)] transition"
        aria-label="Create Event"
      >
        <PlusCircle className="h-4 w-4" />
        Create Event
      </button>

      <div className="space-y-1">
        <div className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dashboard</div>
        <SidebarLink
          href="#"
          label="Overview"
          Icon={LayoutDashboard}
          onClick={() => {
            onRoute("overview");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Calendar"
          Icon={Calendar}
          onClick={() => {
            onRoute("calendar");
            setIsMobileOpen(false);
          }}
        />
      </div>

      <SidebarSection title="Event Vault" defaultOpen>
        <SidebarLink
          href="#"
          label="My Events"
          Icon={FolderOpen}
          onClick={() => {
            onRoute("vault");
            setIsMobileOpen(false);
          }}
        />
        {/* Event Cards list under Event Vault */}
        <div className="mt-2 space-y-1">
          {sorted.map((ev) => {
            const active = selectedEventId === ev.id;
            return (
              <button
                key={ev.id}
                onClick={() => {
                  onSelectEvent(ev.id);
                  onRoute("eventDetail");
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 text-sm transition",
                  "bg-white/0 hover:bg-white/10 text-slate-200",
                  active && "bg-white/10 border-l-4 border-[color:var(--oh-primary)]"
                )}
                aria-current={active ? "true" : undefined}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">
                    {new Date(ev.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[10px] text-slate-400">{Math.round(ev.progress)}%</span>
                </div>
                <div className="truncate text-slate-200 text-xs mt-0.5">{ev.name}</div>
                <div className="mt-1 h-1 rounded bg-white/10">
                  <div
                    className="h-1 rounded bg-[color:var(--oh-primary)]"
                    style={{ width: `${ev.progress}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection title="Planning" defaultOpen>
        <SidebarLink
          href="#"
          label="Vendors"
          Icon={Store}
          onClick={() => {
            onRoute("vendors");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Proposals"
          Icon={FileSignature}
          onClick={() => {
            onRoute("proposals");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Contracts"
          Icon={ScrollText}
          onClick={() => {
            onRoute("contracts");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Budget"
          Icon={Wallet}
          onClick={() => {
            onRoute("budget");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Guests"
          Icon={Users}
          onClick={() => {
            onRoute("guests");
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Tasks"
          Icon={CheckSquare}
          onClick={() => {
            onRoute("tasks");
            setIsMobileOpen(false);
          }}
        />
      </SidebarSection>

      <SidebarSection title="Account" defaultOpen>
        <SidebarLink
          href="#"
          label="Settings"
          Icon={Settings}
          onClick={() => {
            setIsMobileOpen(false);
          }}
        />
        <SidebarLink
          href="#"
          label="Help"
          Icon={HelpCircle}
          onClick={() => {
            setIsMobileOpen(false);
          }}
        />
      </SidebarSection>
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

