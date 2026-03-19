"use client";

/**
 * Venue Dashboard
 * 
 * Route: /venue/dashboard
 * 
 * Matches DIY Planner and Pro Planner styling with:
 * - Same background colors (--oh-bg, --oh-surface)
 * - Same sidebar styling (--oh-sidebar)
 * - Same header gradient
 * - Same typography and spacing
 */

import { VenueHeader } from "./Header";
import { VenueSidebar } from "./Sidebar";
import { Card } from "@/components/ui";
import { useState } from "react";
import {
  Building2,
  Calendar,
  MessageSquare,
  DollarSign,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type UIRoute = "overview" | "leads" | "calendar" | "messages" | "settings";

interface VenueDashboardProps {
  orgName: string;
}

export function VenueDashboard({ orgName }: VenueDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const Main = () => {
    switch (uiRoute) {
      case "overview":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-2">Welcome, {orgName}!</h2>
              <p className="text-slate-600">
                Manage your venue, respond to booking requests, and maximize your bookings.
              </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Today's Leads</div>
                    <div className="text-2xl font-semibold mt-1">0</div>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-100">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Upcoming Bookings</div>
                    <div className="text-2xl font-semibold mt-1">0</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Unread Messages</div>
                    <div className="text-2xl font-semibold mt-1">0</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-100">
                    <MessageSquare className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 mb-1">Get Started</h3>
                  <p className="text-sm text-indigo-800 mb-3">
                    Complete these steps to maximize your bookings:
                  </p>
                  <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                    <li>Add your venue spaces and capacity details</li>
                    <li>Upload photos and virtual tour</li>
                    <li>Set your availability and blackout dates</li>
                    <li>Configure rental rates and policies</li>
                  </ol>
                </div>
              </div>
            </Card>
          </section>
        );

      case "leads":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Leads & Booking Requests</h2>
            <p className="text-slate-600">Lead management coming soon...</p>
          </section>
        );

      case "calendar":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Calendar & Bookings</h2>
            <p className="text-slate-600">Calendar view coming soon...</p>
          </section>
        );

      case "messages":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Messages</h2>
            <p className="text-slate-600">Messaging coming soon...</p>
          </section>
        );

      case "settings":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <p className="text-slate-600">Settings panel coming soon...</p>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full m-0 p-0 flex flex-col bg-[color:var(--oh-bg)]">
      {/* Sticky Header - matches DIY/Pro Planner */}
      <VenueHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main content with sidebar */}
      <div className="flex-1 flex">
        <VenueSidebar
          currentRoute={uiRoute}
          onRoute={setUiRoute}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        <main className="flex-1 p-6">
          <Main />
        </main>
      </div>
    </div>
  );
}

