"use client";

/**
 * Vendor Dashboard
 * 
 * Route: /vendor/dashboard
 * 
 * Matches DIY Planner and Pro Planner styling with:
 * - Same background colors (--oh-bg, --oh-surface)
 * - Same sidebar styling (--oh-sidebar)
 * - Same header gradient
 * - Same typography and spacing
 */

import { VendorHeader } from "./Header";
import { VendorSidebar } from "./Sidebar";
import { Card } from "@/components/ui";
import { useState } from "react";
import {
  Store,
  Calendar,
  MessageSquare,
  DollarSign,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { VendorPaymentPanel } from "@/components/payments/VendorPaymentPanel";

type UIRoute = "overview" | "leads" | "payments" | "calendar" | "messages" | "settings";

interface BookingRequest {
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
}

interface VendorDashboardProps {
  orgName: string;
  orgSlug: string;
  stats: {
    todaysLeads: number;
    upcomingEvents: number;
    unreadMessages: number;
  };
  recentRequests: BookingRequest[];
  paymentContracts?: Array<{
    id: string;
    title: string;
    status: string;
    proposal: {
      id: string;
      currency: string;
      milestones: Array<{
        id: string;
        title: string;
        amountCents: number;
        status: string;
        dueDate?: Date | null;
      }>;
    };
    event: {
      name: string;
      startAt: Date;
    };
  }>;
}

export function VendorDashboard({
  orgName,
  orgSlug,
  stats,
  recentRequests,
  paymentContracts = [],
}: VendorDashboardProps) {
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
                Manage your services, respond to leads, and grow your business.
              </p>
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
                    <div className="text-sm text-slate-600">Upcoming Events</div>
                    <div className="text-2xl font-semibold mt-1">{stats.upcomingEvents}</div>
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

            {/* Recent Booking Requests */}
            {recentRequests.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Booking Requests</h3>
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
                          {request.listing?.title || "Service Request"}
                          {request.event?.name && ` • ${request.event.name}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(request.startAt).toLocaleDateString()} -{" "}
                          {new Date(request.endAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            request.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : request.status === "QUOTED"
                              ? "bg-blue-100 text-blue-800"
                              : request.status === "DECLINED"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {request.status}
                        </span>
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
                    Complete these steps to maximize your visibility:
                  </p>
                  <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                    <li>Add your service packages and pricing</li>
                    <li>Upload photos to your gallery</li>
                    <li>Set your availability calendar</li>
                    <li>Configure payment and contract settings</li>
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
            {recentRequests.length === 0 ? (
              <p className="text-slate-600">No booking requests yet. Your leads will appear here.</p>
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
                        {request.listing?.title || "Service Request"}
                        {request.event?.name && ` • ${request.event.name}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Requested: {new Date(request.createdAt).toLocaleDateString()} • Event:{" "}
                        {new Date(request.startAt).toLocaleDateString()} -{" "}
                        {new Date(request.endAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          request.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "QUOTED"
                            ? "bg-blue-100 text-blue-800"
                            : request.status === "DECLINED"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case "payments":
        return (
          <section className="space-y-6">
            <VendorPaymentPanel
              contracts={paymentContracts}
              onMarkComplete={async (milestoneId) => {
                const response = await fetch("/api/payments/mark-milestone-complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ milestoneId }),
                });
                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.error || "Failed to mark milestone complete");
                }
              }}
            />
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
      <VendorHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main content with sidebar */}
      <div className="flex-1 flex">
        <VendorSidebar
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

