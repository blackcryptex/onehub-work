"use client";

import { Menu } from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

export function VenueHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full text-white shadow bg-gradient-to-r from-[color:var(--oh-primary)] to-[color:var(--oh-accent)]">
      <div className="mx-auto w-full max-w-none m-0 p-0">
        <div className="py-6 text-center relative">
          {onMenuClick && (
            <button
              className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="[&_button]:text-white [&_button]:hover:bg-white/10 [&_button]:hover:text-white">
              <SignOutButton />
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-tight">Venue Dashboard</h1>
          <p className="text-white/80 text-base mt-1">Manage Your Space</p>
        </div>
      </div>
    </header>
  );
}

