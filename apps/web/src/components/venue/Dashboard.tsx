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
import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { RoleOnboardingPanel } from "@/components/onboarding/RoleOnboardingPanel";

type UIRoute = "overview" | "leads" | "calendar" | "messages" | "settings";

interface VenueDashboardProps {
  orgName: string;
  stats: {
    todaysLeads: number;
    upcomingBookings: number;
    unreadMessages: number;
  };
  recentRequests: Array<{
    id: string;
    createdAt: Date;
    contactName: string;
    contactEmail: string;
    startAt: Date;
    endAt: Date;
    status: string;
    event: {
      id: string;
      name: string | null;
      startAt: Date | null;
    } | null;
    listing: {
      title: string;
    } | null;
  }>;
}

export function VenueDashboard({ orgName, stats, recentRequests }: VenueDashboardProps) {
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
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/requests"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  View booking requests
                </Link>
                <Link
                  href="/marketplace/manage"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage venue listing
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Today's Leads</div>
                    <div className="text-2xl font-semibold mt-1">{stats.todaysLeads}</div>
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
                    <div className="text-2xl font-semibold mt-1">{stats.upcomingBookings}</div>
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
                    <div className="text-2xl font-semibold mt-1">{stats.unreadMessages}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-100">
                    <MessageSquare className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </Card>
            </div>

            {recentRequests.length > 0 && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Recent Booking Requests</h3>
                  <Link href="/requests" className="text-sm font-medium text-indigo-600 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {request.contactName} ({request.contactEmail})
                        </div>
                        <div className="text-sm text-slate-600">
                          {request.listing?.title || "Venue Request"}
                          {request.event?.name && ` • ${request.event.name}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(request.startAt).toLocaleDateString()} -{" "}
                          {new Date(request.endAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-800">
                          {request.status}
                        </span>
                        <Link
                          href="/requests"
                          className="mt-2 block text-right text-xs font-medium text-indigo-600 hover:underline"
                        >
                          Respond
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

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
                  <Link
                    href="/marketplace/manage"
                    className="mt-4 inline-flex rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Create or update venue listing
                  </Link>
                </div>
              </div>
            </Card>
          </section>
        );

      case "leads":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Leads & Booking Requests</h2>
            {recentRequests.length === 0 ? (
              <div className="space-y-3">
                <p className="text-slate-600">No booking requests yet. Venue leads will appear here.</p>
                <Link href="/marketplace/manage" className="text-sm font-medium text-indigo-600 hover:underline">
                  Confirm your venue listing is ready for discovery
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {request.contactName} ({request.contactEmail})
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {request.listing?.title || "Venue Request"}
                        {request.event?.name && ` • ${request.event.name}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Requested: {new Date(request.createdAt).toLocaleDateString()} • Event:{" "}
                        {new Date(request.startAt).toLocaleDateString()} -{" "}
                        {new Date(request.endAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="px-3 py-1 text-sm rounded-full bg-slate-100 text-slate-800">
                        {request.status}
                      </span>
                      <Link
                        href="/requests"
                        className="mt-2 block text-right text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Open request
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        <main className="flex-1 space-y-6 p-6">
          <RoleOnboardingPanel role="VENUE" />
          <Main />
        </main>
      </div>
    </div>
  );
}

