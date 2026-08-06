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
import Link from "next/link";
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
  const activeRequests = recentRequests.filter(
    (request) => request.status !== "DECLINED" && request.status !== "WITHDRAWN",
  );
  const pendingRequests = recentRequests.filter((request) => request.status === "PENDING");
  const followUpRequests = recentRequests.filter((request) =>
    ["PENDING", "QUOTED"].includes(request.status),
  );
  const milestoneDeadlines = paymentContracts.flatMap((contract) =>
    contract.proposal.milestones
      .filter((milestone) => milestone.dueDate)
      .map((milestone) => ({
        ...milestone,
        contractTitle: contract.title,
        eventName: contract.event.name,
        currency: contract.proposal.currency,
      })),
  );
  const heldFundsCount = paymentContracts.reduce(
    (count, contract) =>
      count + contract.proposal.milestones.filter((milestone) => milestone.status === "IN_ESCROW").length,
    0,
  );
  const manualPaymentCount = paymentContracts.reduce(
    (count, contract) =>
      count +
      contract.proposal.milestones.filter((milestone) =>
        ["PENDING", "OVERDUE", "IN_ESCROW"].includes(milestone.status),
      ).length,
    0,
  );

  const formatDate = (date: Date) => new Date(date).toLocaleDateString();

  const StatusPill = ({ status }: { status: string }) => (
    <span
      className={`px-2 py-1 text-xs rounded-full ${
        status === "PENDING"
          ? "bg-yellow-100 text-yellow-800"
          : status === "QUOTED"
          ? "bg-blue-100 text-blue-800"
          : status === "DECLINED"
          ? "bg-red-100 text-red-800"
          : status === "IN_ESCROW"
          ? "bg-indigo-100 text-indigo-800"
          : "bg-slate-100 text-slate-800"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );

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
                    <div className="text-sm text-slate-600">Today&apos;s Leads</div>
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
          <section className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Calendar & scheduling</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Confirmed and active booking dates from recent requests, plus payment milestone deadlines.
                  </p>
                </div>
                <div className="rounded-lg bg-purple-100 p-3 text-purple-700">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900">Upcoming request dates</h3>
                {activeRequests.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No active booking dates are on the dashboard yet. New accepted or quoted requests will appear here.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {activeRequests.map((request) => (
                      <div key={request.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{request.event?.name || request.listing?.title || "Service request"}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {request.listing?.title || "Vendor service"} for {request.contactName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDate(request.startAt)} – {formatDate(request.endAt)}
                            </div>
                          </div>
                          <StatusPill status={request.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-slate-900">Payment milestone deadlines</h3>
                {milestoneDeadlines.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No dated payment milestones are attached to active vendor contracts.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {milestoneDeadlines.map((milestone) => (
                      <div key={milestone.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{milestone.title}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {milestone.contractTitle} • {milestone.eventName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">Due {formatDate(milestone.dueDate!)}</div>
                          </div>
                          <StatusPill status={milestone.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        );

      case "messages":
        return (
          <section className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Messages & follow-up</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Use the communication queue to reply to leads and track dashboard notifications.
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900">Lead communication queue</h3>
                {followUpRequests.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No pending lead replies are waiting. New booking requests and quoted follow-ups appear here.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {followUpRequests.map((request) => (
                      <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{request.contactName}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {request.listing?.title || "Service request"}
                              {request.event?.name && ` • ${request.event.name}`}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Requested {formatDate(request.createdAt)} for {formatDate(request.startAt)}
                            </div>
                          </div>
                          <StatusPill status={request.status} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <a className="font-medium text-indigo-600 hover:underline" href={`mailto:${request.contactEmail}`}>
                            Email {request.contactName}
                          </a>
                          <button
                            className="font-medium text-slate-700"
                            type="button"
                            onClick={() => setUiRoute("leads")}
                          >
                            Review request details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-slate-900">Notification status</h3>
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                  {stats.unreadMessages} unread notifications
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Need OneHub help with a request or contract? Contact support with the request name and event date.
                </p>
                <a
                  className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  href="mailto:support@onehub.events"
                >
                  support@onehub.events
                </a>
              </Card>
            </div>
          </section>
        );

      case "settings":
        return (
          <section className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Vendor settings & readiness</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review profile, listing, and manual payment readiness surfaces already available in OneHub.
                  </p>
                </div>
                <div className="rounded-lg bg-slate-100 p-3 text-slate-700">
                  <Settings className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-6">
                <Store className="h-5 w-5 text-indigo-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Provider profile</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Organization</dt>
                    <dd className="font-medium text-slate-900">{orgName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Slug</dt>
                    <dd className="font-medium text-slate-900">{orgSlug}</dd>
                  </div>
                </dl>
                <Link
                  className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  href="/providers/onboarding?providerType=vendor"
                >
                  Review provider profile
                </Link>
              </Card>

              <Card className="p-6">
                <Calendar className="h-5 w-5 text-purple-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Listings and availability</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {activeRequests.length} active dashboard requests and {pendingRequests.length} pending lead responses are tied to your vendor listing workflow.
                </p>
                <Link
                  className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  href="/marketplace/manage"
                >
                  Manage listings
                </Link>
              </Card>

              <Card className="p-6">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="mt-3 font-semibold text-slate-900">Payment readiness</h3>
                <p className="mt-3 text-sm text-slate-600">
                  {manualPaymentCount} manual milestone statuses are visible here; {heldFundsCount} currently show funds held.
                </p>
                <Link
                  className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                  href="/app/billing/connect"
                >
                  Check payout readiness
                </Link>
              </Card>
            </div>

            <Card className="border-amber-200 bg-amber-50 p-6">
              <h3 className="font-semibold text-amber-950">Private pilot boundary</h3>
              <p className="mt-2 text-sm text-amber-900">
                Payment information remains milestone and manual status only. This dashboard does not enable live charging, payouts, or production payment activation.
              </p>
            </Card>
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

