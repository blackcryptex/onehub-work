"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useState, useEffect, useRef } from "react";

export function LandingHeader() {
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMore(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMore(false);
      }
    }

    if (showMore) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showMore]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="text-lg font-semibold text-indigo-600">
          OneHub Events
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/features" className="text-sm font-medium text-slate-700 hover:text-indigo-600">
            Features
          </Link>
          
          {/* More dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              className="text-sm font-medium text-slate-700 hover:text-indigo-600"
              aria-haspopup="menu"
              aria-expanded={showMore}
              aria-controls="more-menu"
            >
              More
            </button>
            {showMore && (
              <div
                id="more-menu"
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50"
              >
                <div className="py-1">
                  <Link
                    href="/events/new"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Event Wizard
                  </Link>
                  <Link
                    href="/app/vault"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Event Vault
                  </Link>
                  <Link
                    href="/diy-planner"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    DIY Planner
                  </Link>
                  <Link
                    href="/professional-planner/setup"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Professional Planner
                  </Link>
                  <Link
                    href="/marketplace"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Vendors/Venues
                  </Link>
                  <Link
                    href="/support"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Support
                  </Link>
                  <Link
                    href="/help"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Help Center
                  </Link>
                  <Link
                    href="/privacy"
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMore(false)}
                    role="menuitem"
                  >
                    Privacy &amp; Terms
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right: Search and Auth */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex">
            <input
              type="search"
              placeholder="Search..."
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sign In */}
          <Button asChild variant="ghost">
            <Link href="/signin">Sign in</Link>
          </Button>

          {/* Create Account */}
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

