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

interface ProfileReadiness {
  hasListings: boolean;
  hasContact: boolean;
  hasAvailability: boolean;
  hasPaymentSetup: boolean;
}

interface BookingRequest {
  id: string;
  createdAt: Date;
  contactName: string;
  contactEmail: string;
  startAt: Date;
  endAt: Date;
  message?: string | null;
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
  profileReadiness?: ProfileReadiness;
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
  stats,
  recentRequests,
  profileReadiness = {
    hasListings: false,
    hasContact: false,
    hasAvailability: false,
    hasPaymentSetup: false,
  },
  paymentContracts = [],
}: VendorDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingRequests = recentRequests.filter((request) => request.status === "PENDING");
  const followUpRequests = recentRequests.filter((request) => request.status === "QUOTED");
  const activeRequests = recentRequests.filter(
    (request) => request.status !== "DECLINED" && request.status !== "WITHDRAWN"
  );
  const upcomingRequest = [...activeRequests].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
  const nextLead = pendingRequests[0] ?? followUpRequests[0] ?? activeRequests[0];
  const heldMilestones = paymentContracts.flatMap((contract) =>
    contract.proposal.milestones.filter((milestone) => milestone.status === "IN_ESCROW")
  );
  const pendingPaymentMilestones = paymentContracts.flatMap((contract) =>
    contract.proposal.milestones.filter(
      (milestone) => milestone.status === "PENDING" || milestone.status === "OVERDUE"
    )
  );
  const readinessItems = [
    { label: "Add at least one listing", done: profileReadiness.hasListings },
    { label: "Add public contact details", done: profileReadiness.hasContact },
    { label: "Set availability for incoming leads", done: profileReadiness.hasAvailability },
    { label: "Keep payment setup manual-safe", done: profileReadiness.hasPaymentSetup },
  ];
  const openReadinessItems = readinessItems.filter((item) => !item.done);
  const formatDate = (date: Date) => new Date(date).toLocaleDateString();
  const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} ${count === 1 ? singular : plural}`;

  const routeButtonClass =
    "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";
  const secondaryButtonClass =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

  const Main = () => {
    switch (uiRoute) {
      case "overview":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Welcome, {orgName}</p>
              <h2 className="mt-2 text-2xl font-bold">Lead response command center</h2>
              <p className="mt-2 max-w-3xl text-slate-600">
                Start with the newest money-making lead, then confirm dates, contact, contract, and manual payment readiness before committing.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={routeButtonClass} onClick={() => setUiRoute("leads")}>
                  Open lead queue
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("calendar")}>
                  Calendar overview
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("payments")}>
                  Payment overview
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                  Fix profile readiness
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">New leads today</div>
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

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <Store className="mt-1 h-5 w-5 text-indigo-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Lead action now</h3>
                    <p className="text-sm text-slate-600">{pluralize(pendingRequests.length, "new lead")}</p>
                    <p className="text-sm text-slate-600">{pluralize(followUpRequests.length, "follow-up needed", "follow-ups needed")}</p>
                    <p className="text-sm font-medium text-slate-900">
                      {nextLead
                        ? `Next safe response: Reply to ${nextLead.contactName} about ${nextLead.listing?.title || "their service request"}`
                        : "Next safe response: Keep profile ready; new leads will appear here."}
                    </p>
                    <button type="button" className={routeButtonClass} onClick={() => setUiRoute("leads")}>
                      Respond in Leads
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 h-5 w-5 text-purple-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Upcoming work</h3>
                    <p className="text-sm text-slate-600">
                      {upcomingRequest
                        ? `Next service date: ${formatDate(upcomingRequest.startAt)} for ${upcomingRequest.event?.name || upcomingRequest.listing?.title || "booking request"}`
                        : "No dated booking requests yet; keep availability current for new leads."}
                    </p>
                    <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("calendar")}>
                      Open Calendar
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <DollarSign className="mt-1 h-5 w-5 text-emerald-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Contract & payment readiness</h3>
                    <p className="text-sm text-slate-600">
                      Manual payment readiness: {heldMilestones.length > 0
                        ? `Funds held for ${pluralize(heldMilestones.length, "milestone")}`
                        : pendingPaymentMilestones.length > 0
                        ? `${pluralize(pendingPaymentMilestones.length, "milestone")} awaiting manual payment status`
                        : "No active payment milestones need action."}
                    </p>
                    <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("payments")}>
                      Review payment readiness
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="flex items-start gap-3">
                  <Settings className="mt-1 h-5 w-5 text-indigo-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-indigo-900">Profile readiness</h3>
                    <p className="text-sm text-indigo-800">
                      {openReadinessItems.length === 0
                        ? "Listing, contact, availability, and manual payment readiness are in place."
                        : `Needs attention: ${openReadinessItems.map((item) => item.label).join(", ")}.`}
                    </p>
                    <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                      Fix profile readiness
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 border-indigo-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Safe vendor response path</h3>
                  <p className="text-sm text-slate-600">
                    Use Leads for client contact, Calendar for service dates, Payments for manual milestone status, and Settings for profile readiness. Live checkout remains off here.
                  </p>
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
              <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="font-medium text-slate-900">No active leads yet.</p>
                <p className="text-sm text-slate-600">
                  Keep your listing, contact details, availability, and manual payment readiness complete so new booking requests can be answered quickly.
                </p>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                  Review profile readiness
                </button>
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
                      <div className="mt-2 flex justify-end gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("messages")}>
                          Contact lead
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("calendar")}>
                          Check date
                        </button>
                      </div>
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
            {activeRequests.length === 0 ? (
              <p className="text-slate-600">No dated booking requests yet. When a lead includes a service date, it will appear here for schedule review before you respond.</p>
            ) : (
              <div className="space-y-3">
                {activeRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="font-medium text-slate-900">{request.event?.name || request.listing?.title || "Booking request"}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {formatDate(request.startAt)} - {formatDate(request.endAt)} • {request.contactName} • {request.status}
                    </div>
                    <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={() => setUiRoute("leads")}>
                      Review lead before confirming
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case "messages":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Lead Messages</h2>
            {recentRequests.length === 0 ? (
              <p className="text-slate-600">Lead contact starts from booking requests. New requests will show the client name and email here without opening any live checkout flow.</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="font-medium text-slate-900">{request.contactName}</div>
                    <div className="mt-1 text-sm text-slate-600">{request.contactEmail}</div>
                    <div className="mt-1 text-sm text-slate-600">{request.message || "No message body provided with this booking request."}</div>
                    <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={() => setUiRoute("leads")}>
                      Return to lead
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case "settings":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Profile readiness</h2>
            <div className="space-y-3">
              {readinessItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {item.done ? "Ready" : "Needs attention"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Profile readiness is shown here as a safe checklist; live payment setup or checkout changes are not enabled from this dashboard.
            </p>
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

