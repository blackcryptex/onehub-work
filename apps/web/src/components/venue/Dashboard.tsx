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

interface ProfileReadiness {
  hasSpaces: boolean;
  hasContact: boolean;
  hasAvailability: boolean;
  hasPaymentSetup: boolean;
}

interface BookingRequest {
  id: string;
  createdAt: Date;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  startAt: Date;
  endAt: Date;
  guests?: number | null;
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

interface VenueDashboardProps {
  orgName: string;
  orgSlug: string;
  stats: {
    todaysLeads: number;
    upcomingEvents: number;
    unreadMessages: number;
  };
  recentRequests: BookingRequest[];
  profileReadiness?: ProfileReadiness;
  bookingContracts?: Array<{
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

export function VenueDashboard({
  orgName,
  stats,
  recentRequests,
  profileReadiness = {
    hasSpaces: false,
    hasContact: false,
    hasAvailability: false,
    hasPaymentSetup: false,
  },
  bookingContracts = [],
}: VenueDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingRequests = recentRequests.filter((request) => request.status === "PENDING");
  const holdRequests = recentRequests.filter((request) => request.status === "HOLD");
  const quotedRequests = recentRequests.filter((request) => request.status === "QUOTED");
  const activeRequests = recentRequests.filter(
    (request) => request.status !== "DECLINED" && request.status !== "WITHDRAWN" && request.status !== "EXPIRED"
  );
  const now = new Date();
  const futureActiveRequests = activeRequests.filter((request) => request.startAt >= now);
  const upcomingRequest = [...futureActiveRequests].sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
  const nextInquiry = pendingRequests[0] ?? holdRequests[0] ?? quotedRequests[0] ?? activeRequests[0];
  const heldMilestones = bookingContracts.flatMap((contract) =>
    contract.proposal.milestones.filter((milestone) => milestone.status === "IN_ESCROW" || milestone.status === "HELD")
  );
  const pendingPaymentMilestones = bookingContracts.flatMap((contract) =>
    contract.proposal.milestones.filter(
      (milestone) => milestone.status === "PENDING" || milestone.status === "OVERDUE"
    )
  );
  const readinessItems = [
    { label: "Add venue spaces and capacity details", done: profileReadiness.hasSpaces },
    { label: "Add venue contact details", done: profileReadiness.hasContact },
    { label: "Set availability and blackout dates", done: profileReadiness.hasAvailability },
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
              <h2 className="mt-2 text-2xl font-bold">Venue booking command center</h2>
              <p className="mt-2 max-w-3xl text-slate-600">
                Start with new inquiries, then confirm holds, tour timing, calendar fit, and manual booking readiness before promising a date.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={routeButtonClass} onClick={() => setUiRoute("leads")}>
                  Open inquiry queue
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("calendar")}>
                  Calendar overview
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("messages")}>
                  Lead contact
                </button>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                  Fix venue readiness
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">New inquiries today</div>
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
                    <div className="text-sm text-slate-600">Upcoming holds/bookings</div>
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
                  <Building2 className="mt-1 h-5 w-5 text-indigo-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900">Inquiry action now</h3>
                    <p className="text-sm text-slate-600">{pluralize(pendingRequests.length, "new inquiry", "new inquiries")}</p>
                    <p className="text-sm text-slate-600">{pluralize(holdRequests.length, "hold/tour to confirm", "holds/tours to confirm")}</p>
                    <p className="text-sm font-medium text-slate-900">
                      {nextInquiry
                        ? `Next safe response: Reply to ${nextInquiry.contactName} about ${nextInquiry.listing?.title || "their venue inquiry"}`
                        : "Next safe response: Keep venue profile ready; new inquiries will appear here."}
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
                    <h3 className="font-semibold text-slate-900">Upcoming venue dates</h3>
                    <p className="text-sm text-slate-600">
                      {upcomingRequest
                        ? `Next event date: ${formatDate(upcomingRequest.startAt)} for ${upcomingRequest.event?.name || upcomingRequest.listing?.title || "venue booking request"}`
                        : "No upcoming venue dates; keep availability current before accepting a new hold."}
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
                    <h3 className="font-semibold text-slate-900">Booking & payment readiness</h3>
                    <p className="text-sm text-slate-600">
                      Booking readiness: {heldMilestones.length > 0
                        ? `Funds held for ${pluralize(heldMilestones.length, "manual payment milestone")}`
                        : pendingPaymentMilestones.length > 0
                        ? `${pluralize(pendingPaymentMilestones.length, "manual payment milestone")} awaiting status`
                        : "No active payment milestones need action."}
                    </p>
                    <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                      Review booking readiness
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="flex items-start gap-3">
                  <Settings className="mt-1 h-5 w-5 text-indigo-600" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-indigo-900">Venue profile readiness</h3>
                    <p className="text-sm text-indigo-800">
                      {openReadinessItems.length === 0
                        ? "Spaces, contact, availability, and manual payment readiness are in place."
                        : `Needs attention: ${openReadinessItems.map((item) => item.label).join(", ")}.`}
                    </p>
                    <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                      Fix venue readiness
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 border-indigo-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Safe venue response path</h3>
                  <p className="text-sm text-slate-600">
                    Use Leads for inquiry response, Messages for client contact, Calendar for holds/tours/bookings, and Settings for readiness. Live checkout remains off here.
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
                <p className="font-medium text-slate-900">No active venue inquiries yet.</p>
                <p className="text-sm text-slate-600">
                  Keep venue spaces, contact details, availability, and manual booking readiness complete so new inquiries can be answered quickly.
                </p>
                <button type="button" className={secondaryButtonClass} onClick={() => setUiRoute("settings")}>
                  Review venue readiness
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="font-medium">
                        {request.contactName} ({request.contactEmail})
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {request.listing?.title || "Venue inquiry"}
                        {request.event?.name && ` • ${request.event.name}`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Requested: {new Date(request.createdAt).toLocaleDateString()} • Event: {formatDate(request.startAt)} - {formatDate(request.endAt)}
                        {request.guests ? ` • ${request.guests} guests` : ""}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          request.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "HOLD"
                            ? "bg-purple-100 text-purple-800"
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
                          Check hold date
                        </button>
                      </div>
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
            <h2 className="text-xl font-semibold mb-4">Calendar & Holds</h2>
            {futureActiveRequests.length === 0 ? (
              <p className="text-slate-600">No upcoming venue holds, tours, or bookings. Keep availability current; future active booking requests will appear here before you confirm a date.</p>
            ) : (
              <div className="space-y-3">
                {futureActiveRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="font-medium text-slate-900">{request.event?.name || request.listing?.title || "Venue booking request"}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {formatDate(request.startAt)} - {formatDate(request.endAt)} • {request.contactName} • {request.status}
                      {request.guests ? ` • ${request.guests} guests` : ""}
                    </div>
                    <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={() => setUiRoute("leads")}>
                      Review inquiry before confirming
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
            <h2 className="text-xl font-semibold mb-4">Inquiry Messages</h2>
            {recentRequests.length === 0 ? (
              <p className="text-slate-600">Lead contact starts from venue booking requests. New requests will show the client name, email, phone, and message here without opening any live checkout flow.</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="font-medium text-slate-900">{request.contactName}</div>
                    <div className="mt-1 text-sm text-slate-600">{request.contactEmail}{request.contactPhone ? ` • ${request.contactPhone}` : ""}</div>
                    <div className="mt-1 text-sm text-slate-600">{request.message || "No message body provided with this venue booking request."}</div>
                    <button type="button" className={`${secondaryButtonClass} mt-3`} onClick={() => setUiRoute("leads")}>
                      Return to inquiry
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
            <h2 className="text-xl font-semibold mb-4">Venue profile readiness</h2>
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
              Venue readiness is shown here as a safe checklist; live payment setup or checkout changes are not enabled from this dashboard.
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