"use client";

/**
 * Pro Planner Dashboard
 * 
 * Route: /pro/planner
 * 
 * Matches DIY Planner styling with:
 * - Same background colors (--oh-bg, --oh-surface)
 * - Same sidebar styling (--oh-sidebar)
 * - Same header gradient
 * - Same typography and spacing
 */

import { ProPlannerHeader } from "./Header";
import { ProPlannerSidebar } from "./Sidebar";
import { Card, Button } from "@/components/ui";
import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { 
  Briefcase, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  Image as ImageIcon,
  Settings,
  Sparkles,
  Folder,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Store,
  WalletCards,
} from "lucide-react";
import { EventActions } from "@/components/events/EventActions";
import { contractDetail, vaultDetail } from "@/lib/routes";
import type { Role } from "@onehub/types/src/roles";

type UIRoute = "overview" | "services" | "availability" | "payments" | "portfolio" | "settings";

type Event = {
  id: string;
  name: string;
  slug: string;
  startAt: Date;
  endAt?: Date;
  type?: string;
  guestTarget?: number | null;
  venueCity?: string | null;
  venueState?: string | null;
  status: string;
  org: {
    name: string;
    slug: string;
    ownerId: string;
  };
  createdBy: {
    id: string;
    name: string | null;
  };
  bookingRequests?: Array<{
    id: string;
    status: string;
    startAt?: Date;
    endAt?: Date;
    listing?: { title: string; category?: string | null; type?: string | null };
  }>;
  shortlistItems?: Array<{ id: string; listing?: { title: string; category?: string | null; type?: string | null } }>;
  milestones?: Array<{ id: string; title: string; dueAt: Date | null; done: boolean }>;
  proposals?: Array<{
    id: string;
    title: string;
    status: string;
    totalCents: number;
    currency: string;
    milestones?: Array<{ id: string; title?: string; status: string; amountCents: number; dueDate?: Date | null }>;
    contract?: { id: string; title: string; status: string } | null;
  }>;
  contracts?: Array<{
    id: string;
    title: string;
    status: string;
    paymentIntents?: Array<{ id: string; status: string; amountCents: number; currency: string; fundedAt?: Date | null }>;
    proposal?: { id: string; title: string } | null;
  }>;
};

type OrgProfile = {
  slug: string;
  about?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  instagram?: string | null;
  profileStatus?: string | null;
  servicesJson?: unknown;
  availabilityJson?: unknown;
  paymentsJson?: unknown;
  mediaJson?: unknown;
  settings?: { timezone: string; currency: string; billingEmail?: string | null; legalEntity?: string | null } | null;
  listings?: Array<{
    id: string;
    title: string;
    type: string;
    category: string;
    description?: string | null;
    city?: string | null;
    state?: string | null;
    ratingAvg?: number;
    ratingCount?: number;
    offers?: Array<{ id: string; name: string; description?: string | null; priceCents?: number | null; unit?: string | null }>;
    gallery?: Array<{ id: string; url: string; caption?: string | null }>;
  }>;
};

interface ProPlannerDashboardProps {
  orgName: string;
  events: Event[];
  userId: string;
  userRole: string;
  orgOwnerId: string;
  orgProfile?: OrgProfile;
}

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "Date pending";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amountCents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountCents / 100);

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function ProPlannerDashboard({ orgName, events, userId, userRole, orgOwnerId, orgProfile }: ProPlannerDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<Event[]>(events);

  const sortedEvents = [...localEvents].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const upcomingEvents = sortedEvents.filter((event) => new Date(event.startAt) >= new Date());
  const primaryEvent = upcomingEvents[0] ?? sortedEvents[0];
  const allProposals = localEvents.flatMap((event) =>
    (event.proposals ?? []).map((proposal) => ({ ...proposal, event })),
  );
  const allContracts = localEvents.flatMap((event) =>
    (event.contracts ?? []).map((contract) => ({ ...contract, event })),
  );
  const paymentIntents = allContracts.flatMap((contract) =>
    (contract.paymentIntents ?? []).map((intent) => ({ ...intent, contract })),
  );
  const pendingPaymentMilestones = allProposals.flatMap((proposal) =>
    (proposal.milestones ?? [])
      .filter((milestone) => ["PENDING", "OVERDUE", "IN_ESCROW"].includes(milestone.status))
      .map((milestone) => ({ ...milestone, proposal })),
  );
  const fundedPaymentTotal = paymentIntents
    .filter((intent) => intent.status === "SUCCEEDED" || intent.fundedAt)
    .reduce((sum, intent) => sum + intent.amountCents, 0);
  const openPaymentTotal = paymentIntents
    .filter((intent) => ["REQUIRES_PAYMENT", "PROCESSING"].includes(intent.status))
    .reduce((sum, intent) => sum + intent.amountCents, 0);
  const openMilestoneTotal = pendingPaymentMilestones.reduce((sum, milestone) => sum + milestone.amountCents, 0);
  const serviceDrafts = asArray<{ name?: string; category?: string; description?: string; startingPrice?: number | null }>(orgProfile?.servicesJson);
  const availability = asRecord(orgProfile?.availabilityJson);
  const paymentsProfile = asRecord(orgProfile?.paymentsJson);
  const mediaProfile = asRecord(orgProfile?.mediaJson);
  const galleryUrls = asArray<string>(mediaProfile.galleryUrls);
  const profileChecklist = [
    { label: "Business summary", ready: Boolean(orgProfile?.about) },
    { label: "Service listings", ready: Boolean(orgProfile?.listings?.length || serviceDrafts.length) },
    { label: "Contact path", ready: Boolean(orgProfile?.contactEmail || orgProfile?.website) },
    { label: "Portfolio media", ready: Boolean(galleryUrls.length || orgProfile?.listings?.some((listing) => listing.gallery?.length)) },
    { label: "Payment terms", ready: Object.keys(paymentsProfile).length > 0 },
    { label: "Availability rules", ready: Object.keys(availability).length > 0 },
  ];
  const readyProfileItems = profileChecklist.filter((item) => item.ready).length;
  const typedRole = userRole as Role;

  const handleDeleteEvent = async (eventSlug: string, eventId: string, _eventName: string) => {
    const response = await fetch(`/api/events/${eventSlug}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to delete event" }));
      throw new Error(error.error || "Failed to delete event");
    }

    // Remove event from local state
    setLocalEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const canManageEvent = (event: Event): boolean => {
    // Mirror server-side RBAC logic from apps/web/src/lib/rbac.ts canManageEvent function
    // Admin can manage all events
    if (userRole === "ADMIN") return true;
    // Org owner can manage all events in their org
    if (orgOwnerId === userId) return true;
    // Planner isolation: planners can only manage events they created
    if (userRole === "DIY_PLANNER" || userRole === "PRO_PLANNER") {
      return event.createdBy.id === userId;
    }
    // Other org members (non-planners) can manage events in their org
    // Since we're in a Pro Planner context and already filtered by org, if user is org member, they can manage
    // For simplicity, if user is org owner (checked above) or created the event, they can manage
    // This matches the server-side logic where non-planner org members can manage events in their org
    return event.createdBy.id === userId;
  };

  const Main = () => {
    switch (uiRoute) {
      case "overview":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Agency command deck</p>
              <h2 className="mt-1 text-2xl font-bold mb-2">Welcome, {orgName}!</h2>
              <p className="text-slate-600">
                Pick an event and open its command center for sourcing, proposals, contracts, payments, and execution.
              </p>
            </div>

            {/* Events Section */}
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Your Events</h3>
                <Button asChild size="sm">
                  <Link href="/events/new">Create Event</Link>
                </Button>
              </div>

              {localEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No events yet. Create your first event to get started.</p>
                  <Button asChild>
                    <Link href="/events/new">Create Event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {localEvents.map((event) => {
                    const canManage = canManageEvent(event);
                    const eventDate = new Date(event.startAt);
                    const formattedDate = eventDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <Card
                        key={event.id}
                        className="p-4 hover:shadow-md transition-shadow border border-slate-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Link
                                href={vaultDetail(typedRole, event.slug) as Route}
                                className="text-lg font-semibold text-slate-900 hover:text-[color:var(--oh-primary)] transition-colors"
                              >
                                {event.name}
                              </Link>
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                {event.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{formattedDate}</span>
                              </div>
                              {event.org && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4" />
                                  <span>{event.org.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button asChild size="sm">
                                <Link href={vaultDetail(typedRole, event.slug) as Route}>Open Event Command Center</Link>
                              </Button>
                              <EventActions
                                role={typedRole}
                                eventSlug={event.slug}
                                eventId={event.id}
                                eventName={event.name}
                                canEdit={canManage}
                                canDelete={canManage}
                                onDelete={handleDeleteEvent}
                                onDeleted={() => {
                                  // Event already removed from state in handleDeleteEvent
                                }}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("services")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-100">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold">Services & event needs</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Review active event vendor gaps, published services, and package coverage.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("availability")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Availability timeline</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Use event dates, milestone due dates, and booking rules to plan capacity.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("payments")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">Payments & contracts</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Monitor contracts, payment intents, and manual milestone status without activating live payments.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("portfolio")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-rose-100">
                    <ImageIcon className="w-5 h-5 text-rose-600" />
                  </div>
                  <h3 className="font-semibold">Portfolio readiness</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Audit the client-facing profile, marketplace proof, and readiness gaps.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("services")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Client event management</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Review client events, vendor needs, requests, and proposal coverage from the service workflow.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("settings")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="font-semibold">Settings</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Review organization, account, and safe operational status from loaded records.
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 mb-1">Quick Start Guide</h3>
                  <p className="text-sm text-indigo-800 mb-3">
                    Complete these steps to get your Pro Planner profile ready:
                  </p>
                  <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                    <li>Review service coverage against active event needs</li>
                    <li>Set your service area and travel preferences</li>
                    <li>Audit profile readiness and client-facing proof</li>
                    <li>Confirm manual payment and contract status before client handoff</li>
                  </ol>
                </div>
              </div>
            </Card>
          </section>
        );

      case "services":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Service workflow</p>
                  <h2 className="text-xl font-semibold mt-1">Services & event needs</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Match your Pro Planner services to real client events, shortlists, requests, and vendor handoff status.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/providers/onboarding?providerType=vendor">Update service profile</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Published service surfaces</h3>
                <div className="mt-4 space-y-3">
                  {(orgProfile?.listings?.length ?? 0) > 0 ? (
                    orgProfile?.listings?.map((listing) => (
                      <div key={listing.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{listing.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {listing.type.replace(/_/g, " ")} / {listing.category.replace(/_/g, " ")}
                              {listing.city ? ` / ${listing.city}, ${listing.state ?? ""}` : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            {listing.offers?.length ?? 0} offer{(listing.offers?.length ?? 0) === 1 ? "" : "s"}
                          </span>
                        </div>
                        {listing.description && <p className="mt-3 text-sm text-slate-600">{listing.description}</p>}
                        {(listing.offers?.length ?? 0) > 0 && (
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {listing.offers?.slice(0, 3).map((offer) => (
                              <li key={offer.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                                <span>{offer.name}</span>
                                <span className="font-semibold">
                                  {offer.priceCents ? formatCurrency(offer.priceCents) : offer.unit || "Custom"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  ) : serviceDrafts.length > 0 ? (
                    serviceDrafts.map((service, index) => (
                      <div key={`${service.name ?? "service"}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{service.name || service.category || "Draft service"}</p>
                        <p className="mt-1 text-sm text-slate-600">{service.description || "Drafted in the service profile and ready to refine for marketplace listing."}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No service listings are published yet. Use the service profile workflow to define packages before client-facing sharing.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Event demand queue</h3>
                <div className="mt-4 space-y-3">
                  {sortedEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{event.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(event.startAt)} / {event.guestTarget ? `${event.guestTarget} guests` : "Guest target pending"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={vaultDetail(typedRole, event.slug) as Route}>Open vault</Link>
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                        <span>{event.shortlistItems?.length ?? 0} shortlisted</span>
                        <span>{event.bookingRequests?.length ?? 0} requests</span>
                        <span>{event.proposals?.length ?? 0} proposals</span>
                      </div>
                    </div>
                  ))}
                  {sortedEvents.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      Create a client event to start service matching and vendor-need tracking.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </section>
        );

      case "availability":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Calendar readiness</p>
              <h2 className="text-xl font-semibold mt-1">Availability & booking timeline</h2>
              <p className="mt-2 text-sm text-slate-600">
                Upcoming events, booking windows, and milestone deadlines are loaded from event state and profile availability rules.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h3 className="font-semibold text-slate-900">Upcoming event calendar</h3>
                <div className="mt-4 space-y-3">
                  {(upcomingEvents.length > 0 ? upcomingEvents : sortedEvents).slice(0, 5).map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{event.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDate(event.startAt)}{event.endAt ? ` - ${formatDate(event.endAt)}` : ""}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.venueCity ? `${event.venueCity}, ${event.venueState ?? ""}` : "Location pending"}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`${vaultDetail(typedRole, event.slug)}#workspace-timeline-detail` as Route}>Open timeline</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sortedEvents.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No event dates are scheduled yet. Create an event to anchor the calendar.
                    </p>
                  )}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Rules loaded</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Minimum notice</dt><dd className="font-semibold">{String(availability.minNoticeDays ?? "Not set")}</dd></div>
                  <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Events per day</dt><dd className="font-semibold">{String(availability.maxEventsPerDay ?? "Not set")}</dd></div>
                  <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Service radius</dt><dd className="font-semibold">{availability.serviceAreaRadiusMiles ? `${availability.serviceAreaRadiusMiles} miles` : "Not set"}</dd></div>
                  <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Blackout dates</dt><dd className="font-semibold">{asArray(availability.blackoutDates).length}</dd></div>
                </dl>
              </Card>
            </div>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900">Nearest deadlines</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {localEvents
                  .flatMap((event) => (event.milestones ?? []).filter((milestone) => !milestone.done).map((milestone) => ({ ...milestone, event })))
                  .filter((milestone) => milestone.dueAt)
                  .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime())
                  .slice(0, 6)
                  .map((milestone) => (
                    <div key={milestone.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">{milestone.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{milestone.event.name} / {formatDate(milestone.dueAt)}</p>
                    </div>
                  ))}
              </div>
            </Card>
          </section>
        );

      case "payments":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Manual-status-first MVP</p>
              <h2 className="text-xl font-semibold mt-1">Payments & contracts</h2>
              <p className="mt-2 text-sm text-slate-600">
                Tracks proposal, contract, milestone, and payment intent status from OneHub data. Live payment activation remains off here.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Contracts</p><p className="mt-2 text-2xl font-semibold">{allContracts.length}</p></Card>
              <Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Open intents</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(openPaymentTotal)}</p></Card>
              <Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Funded</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(fundedPaymentTotal)}</p></Card>
              <Card className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Milestones pending</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(openMilestoneTotal)}</p></Card>
            </div>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900">Contract payment status</h3>
              <div className="mt-4 space-y-3">
                {allContracts.length > 0 ? allContracts.slice(0, 6).map((contract) => (
                  <div key={contract.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{contract.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{contract.event.name} / {contract.status.replace(/_/g, " ")}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(contract.paymentIntents ?? []).length} payment intent{(contract.paymentIntents ?? []).length === 1 ? "" : "s"} attached
                        </p>
                      </div>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={contractDetail(contract.id) as Route}>Review contract</Link>
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No contracts are attached yet. Payment status begins after accepted proposal work advances to contract.
                  </p>
                )}
              </div>
            </Card>
          </section>
        );

      case "portfolio":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Client-facing readiness</p>
              <h2 className="text-xl font-semibold mt-1">Portfolio & profile readiness</h2>
              <p className="mt-2 text-sm text-slate-600">
                Shows the profile details clients can rely on before sharing events or proposals.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h3 className="font-semibold text-slate-900">Profile snapshot</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{orgProfile?.about || "Add a business summary so clients understand your planning style and scope."}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Market</p><p className="font-semibold">{orgProfile?.city ? `${orgProfile.city}, ${orgProfile.state ?? ""}` : "Market pending"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Status</p><p className="font-semibold">{orgProfile?.profileStatus || "Draft"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Website</p><p className="font-semibold">{orgProfile?.website || "Not connected"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Portfolio media</p><p className="font-semibold">{galleryUrls.length + (orgProfile?.listings?.reduce((sum, listing) => sum + (listing.gallery?.length ?? 0), 0) ?? 0)} asset{galleryUrls.length === 1 ? "" : "s"}</p></div>
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Readiness checklist</h3>
                <p className="mt-2 text-3xl font-semibold">{readyProfileItems}/{profileChecklist.length}</p>
                <div className="mt-4 space-y-2">
                  {profileChecklist.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                      {item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                      {item.label}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900">Recent client-facing proof points</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {orgProfile?.listings?.slice(0, 3).map((listing) => (
                  <div key={listing.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{listing.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{listing.ratingCount ?? 0} review{(listing.ratingCount ?? 0) === 1 ? "" : "s"} / {listing.ratingAvg ?? 0} avg</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        );

      case "settings":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Organization controls</p>
              <h2 className="text-xl font-semibold mt-1">Settings & account status</h2>
              <p className="mt-2 text-sm text-slate-600">
                Read-only MVP settings surface for organization, event, account, and payment configuration status. No inactive save controls are shown.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Organization status</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Organization</dt><dd className="font-semibold">{orgName}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Slug</dt><dd className="font-semibold">{orgProfile?.slug || "Not loaded"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-semibold">{userRole.replace(/_/g, " ")}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Timezone</dt><dd className="font-semibold">{orgProfile?.settings?.timezone || "America/Chicago"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Currency</dt><dd className="font-semibold">{orgProfile?.settings?.currency || "USD"}</dd></div>
                </dl>
              </Card>
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Safe next actions</h3>
                <div className="mt-4 space-y-3">
                  <Button asChild variant="secondary" className="w-full justify-start">
                    <Link href="/events/new"><Calendar className="h-4 w-4" /> Create event</Link>
                  </Button>
                  {primaryEvent && (
                    <Button asChild variant="secondary" className="w-full justify-start">
                      <Link href={vaultDetail(typedRole, primaryEvent.slug) as Route}><ExternalLink className="h-4 w-4" /> Open active event vault</Link>
                    </Button>
                  )}
                  <Button asChild variant="secondary" className="w-full justify-start">
                    <Link href="/providers/onboarding?providerType=vendor"><Store className="h-4 w-4" /> Review service profile</Link>
                  </Button>
                </div>
              </Card>
              <Card className="p-5 lg:col-span-2">
                <h3 className="font-semibold text-slate-900">Operational boundaries</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><ShieldCheck className="h-5 w-5 text-indigo-600" /><p className="mt-2 font-semibold">RBAC preserved</p><p className="mt-1 text-sm text-slate-600">Event actions stay tied to existing permission checks.</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><WalletCards className="h-5 w-5 text-emerald-600" /><p className="mt-2 font-semibold">Manual payment status</p><p className="mt-1 text-sm text-slate-600">No live-payment enablement is exposed from this panel.</p></div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><FileText className="h-5 w-5 text-slate-600" /><p className="mt-2 font-semibold">Source data only</p><p className="mt-1 text-sm text-slate-600">Panels reflect org, profile, event, proposal, and contract records.</p></div>
                </div>
              </Card>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full m-0 p-0 flex flex-col bg-[color:var(--oh-bg)]">
      {/* Sticky Header - matches DIY Planner */}
      <ProPlannerHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main content with sidebar */}
      <div className="flex-1 flex">
        <ProPlannerSidebar
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

