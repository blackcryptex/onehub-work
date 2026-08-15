"use client";

/**
 * Pro Planner Dashboard
 *
 * Route: /pro/planner
 *
 * Top-level operating dashboard for professional planners. The event-specific
 * command center remains the deep workspace; this page shows what needs
 * attention across the planner business today.
 */

import { ProPlannerHeader } from "./Header";
import { ProPlannerSidebar } from "./Sidebar";
import { Card, Button } from "@/components/ui";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Role } from "@onehub/types/src/roles";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Folder,
  Image as ImageIcon,
  ListChecks,
  MessageSquare,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { EventActions } from "@/components/events/EventActions";

type UIRoute =
  | "overview"
  | "services"
  | "availability"
  | "payments"
  | "portfolio"
  | "settings";

type PlannerTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: Date | string | null;
};

type PlannerBookingRequest = {
  id: string;
  status: string;
  createdAt: Date | string;
  contactName: string;
  listing?: { title: string; type: string; category: string } | null;
};

type PlannerProposal = {
  id: string;
  title: string;
  status: string;
  totalCents: number;
  contract?: { id: string; status: string } | null;
  milestones?: { id: string; status: string; amountCents: number; dueDate: Date | string | null }[];
  listing?: { title: string; type: string } | null;
};

type PlannerContract = {
  id: string;
  title: string;
  status: string;
  paymentIntents?: { id: string; status: string; fundedAt: Date | string | null; amountCents: number }[];
};

type PlannerEvent = {
  id: string;
  name: string;
  slug: string;
  startAt: Date | string;
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
  tasks?: PlannerTask[];
  bookingRequests?: PlannerBookingRequest[];
  proposals?: PlannerProposal[];
  contracts?: PlannerContract[];
};

type PlannerListing = {
  id: string;
  title: string;
  type: string;
  category: string;
  city: string | null;
  state: string | null;
};

type PlannerNotification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  createdAt: Date | string;
};

interface ProPlannerDashboardProps {
  orgName: string;
  events: PlannerEvent[];
  userId: string;
  userRole: string;
  orgOwnerId: string;
  listings?: PlannerListing[];
  notifications?: PlannerNotification[];
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function isActiveEvent(status: string) {
  const normalized = status.toUpperCase();
  return !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(normalized);
}

function isOpenTask(status: string) {
  return !["DONE", "COMPLETED", "CANCELLED"].includes(status.toUpperCase());
}

function isOpenRequest(status: string) {
  return !["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"].includes(status.toUpperCase());
}

function isMoneyAttentionStatus(status: string) {
  return ["DRAFT", "SENT", "APPROVED", "OUT_FOR_SIGNATURE", "REQUIRES_PAYMENT", "PENDING"].includes(status.toUpperCase());
}

export function ProPlannerDashboard({
  orgName,
  events,
  userId,
  userRole,
  orgOwnerId,
  listings = [],
  notifications = [],
}: ProPlannerDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<PlannerEvent[]>(events);

  const canManageEvent = (event: PlannerEvent): boolean => {
    if (userRole === "ADMIN") return true;
    if (orgOwnerId === userId) return true;
    if (userRole === "DIY_PLANNER" || userRole === "PRO_PLANNER") {
      return event.createdBy.id === userId;
    }
    return event.createdBy.id === userId;
  };

  const dashboard = useMemo(() => {
    const activeEvents = localEvents.filter((event) => isActiveEvent(event.status));
    const sortedEvents = [...activeEvents].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
    const openTasks = localEvents
      .flatMap((event) => (event.tasks ?? []).filter((task) => isOpenTask(task.status)).map((task) => ({ ...task, event })))
      .sort((a, b) => {
        const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });
    const followUps = localEvents
      .flatMap((event) => [
        ...(event.bookingRequests ?? [])
          .filter((request) => isOpenRequest(request.status))
          .map((request) => ({
            id: `request-${request.id}`,
            event,
            title: request.listing?.title ?? request.contactName,
            label: `Booking request: ${request.status}`,
            detail: request.listing
              ? `${request.listing.type} / ${request.listing.category}`
              : `Contact: ${request.contactName}`,
            href: `/pro/planner/vault/${event.slug}#workspace-requests-detail`,
          })),
        ...(event.proposals ?? [])
          .filter((proposal) => ["DRAFT", "SENT"].includes(proposal.status.toUpperCase()))
          .map((proposal) => ({
            id: `proposal-${proposal.id}`,
            event,
            title: proposal.title,
            label: `Proposal: ${proposal.status}`,
            detail: `${formatMoney(proposal.totalCents)}${proposal.listing?.title ? ` / ${proposal.listing.title}` : ""}`,
            href: `/pro/planner/vault/${event.slug}#workspace-proposals-detail`,
          })),
      ])
      .slice(0, 6);
    const moneyAlerts = localEvents
      .flatMap((event) => [
        ...(event.proposals ?? [])
          .filter((proposal) => isMoneyAttentionStatus(proposal.status))
          .map((proposal) => ({
            id: `proposal-money-${proposal.id}`,
            event,
            title: proposal.title,
            status: proposal.status,
            amountCents: proposal.totalCents,
            href: `/pro/planner/vault/${event.slug}#workspace-proposals-detail`,
          })),
        ...(event.contracts ?? [])
          .filter((contract) => isMoneyAttentionStatus(contract.status))
          .map((contract) => ({
            id: `contract-money-${contract.id}`,
            event,
            title: contract.title,
            status: contract.status,
            amountCents: contract.paymentIntents?.reduce((sum, intent) => sum + intent.amountCents, 0) ?? 0,
            href: `/pro/planner/vault/${event.slug}#workspace-payment-detail`,
          })),
      ])
      .slice(0, 6);
    const unreadNotifications = notifications.filter((notification) => !notification.read);
    const eventDates = sortedEvents.filter((event) => new Date(event.startAt).getTime() >= Date.now()).slice(0, 4);

    return {
      activeEvents,
      sortedEvents,
      nextEvents: eventDates,
      openTasks,
      followUps,
      moneyAlerts,
      unreadNotifications,
      publishedListings: listings.length,
    };
  }, [listings.length, localEvents, notifications]);

  const setupItems = [
    {
      label: "Services and packages",
      done: listings.length > 0,
      action: "Manage marketplace services",
      href: "/marketplace/manage",
    },
    {
      label: "Availability and booking readiness",
      done: dashboard.activeEvents.length > 0,
      action: "Review event calendar",
      href: "/pro/planner/vault",
    },
    {
      label: "Contracts and payment safety",
      done: dashboard.moneyAlerts.length > 0,
      action: "Check money alerts",
      href: "#money-contract-alerts",
    },
    {
      label: "Portfolio and business profile",
      done: listings.length > 0,
      action: "Update profile assets",
      href: "/providers/onboarding?providerType=planner",
    },
  ];

  const handleDeleteEvent = async (eventSlug: string, eventId: string) => {
    const response = await fetch(`/api/events/${eventSlug}`, { method: "DELETE" });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to delete event" }));
      throw new Error(error.error || "Failed to delete event");
    }

    setLocalEvents((prev) => prev.filter((event) => event.id !== eventId));
  };

  const EventList = ({ compact = false }: { compact?: boolean }) => (
    <div className="space-y-3">
      {localEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <Folder className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="font-medium text-slate-900">No client events are loaded yet.</p>
          <p className="mt-1 text-sm text-slate-600">Create the first event to start a command center, checklist, vendor search, and client workspace.</p>
          <Button asChild className="mt-4">
            <Link href="/events/new">Create Event</Link>
          </Button>
        </div>
      ) : (
        (compact ? dashboard.sortedEvents.slice(0, 4) : localEvents).map((event) => {
          const canManage = canManageEvent(event);
          const openTaskCount = (event.tasks ?? []).filter((task) => isOpenTask(task.status)).length;
          const openRequestCount = (event.bookingRequests ?? []).filter((request) => isOpenRequest(request.status)).length;
          const moneyCount = [...(event.proposals ?? []), ...(event.contracts ?? [])].filter((item) => isMoneyAttentionStatus(item.status)).length;

          return (
            <Card key={event.id} className="p-4 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/pro/planner/vault/${event.slug}` as Route}
                      className="text-lg font-semibold text-slate-900 hover:text-[color:var(--oh-primary)]"
                    >
                      {event.name}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {event.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(event.startAt)}</span>
                    <span className="inline-flex items-center gap-1.5"><ListChecks className="h-4 w-4" />{openTaskCount} tasks</span>
                    <span className="inline-flex items-center gap-1.5"><MessageSquare className="h-4 w-4" />{openRequestCount} follow-ups</span>
                    <span className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4" />{moneyCount} money items</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/pro/planner/vault/${event.slug}` as Route}>Open Event Command Center</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/pro/planner/vault/${event.slug}#workspace-sourcing` as Route}>Source vendors</Link>
                    </Button>
                  </div>
                </div>
                {canManage && (
                  <EventActions
                    role={userRole as Role}
                    eventSlug={event.slug}
                    eventId={event.id}
                    eventName={event.name}
                    canEdit={canManage}
                    canDelete={canManage}
                    onDelete={handleDeleteEvent}
                    onDeleted={() => {}}
                    size="sm"
                  />
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );

  const Overview = () => (
    <section className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Professional planner command center</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agency command deck</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-indigo-100">
              Manage today’s event work, client follow-ups, vendor movement, assistant tasks, and money readiness for {orgName}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/events/new">Create Event</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={"/messages" as Route}>Open Messages</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active events</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.activeEvents.length}</p>
          <p className="mt-1 text-sm text-slate-600">client events currently needing planner oversight</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today’s work</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.openTasks.length}</p>
          <p className="mt-1 text-sm text-slate-600">open event and assistant task items</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-ups</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.followUps.length}</p>
          <p className="mt-1 text-sm text-slate-600">client/vendor requests or proposals needing movement</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Money alerts</p>
          <p className="mt-2 text-3xl font-semibold">{dashboard.moneyAlerts.length}</p>
          <p className="mt-1 text-sm text-slate-600">proposal, contract, or payment states to check</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.9fr)]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Calendar className="h-5 w-5 text-indigo-700" />Active client events</h2>
              <p className="mt-1 text-sm text-slate-600">Open each event’s command center to manage vendors, proposals, contracts, payments, tasks, and client access.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/pro/planner/vault">View vault</Link>
            </Button>
          </div>
          <EventList compact />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Clock className="h-5 w-5 text-indigo-700" />Today’s work</h2>
            <div className="mt-4 space-y-3">
              {dashboard.openTasks.length > 0 ? dashboard.openTasks.slice(0, 5).map((task) => (
                <Link key={task.id} href={`/pro/planner/vault/${task.event.slug}#event-workspace` as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{task.event.name} / {task.priority} / due {formatDate(task.dueAt)}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No open event tasks are loaded. New checklist or assistant task items will appear here.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Bell className="h-5 w-5 text-indigo-700" />Unread notifications</h2>
            <div className="mt-4 space-y-3">
              {dashboard.unreadNotifications.length > 0 ? dashboard.unreadNotifications.slice(0, 4).map((notification) => (
                <Link key={notification.id} href={(notification.link || "/messages") as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  {notification.body && <p className="mt-1 text-xs text-slate-600">{notification.body}</p>}
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No unread notifications. Client, vendor, contract, and task alerts will appear here.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-5 w-5 text-indigo-700" />Client/vendor follow-ups</h2>
          <div className="mt-4 space-y-3">
            {dashboard.followUps.length > 0 ? dashboard.followUps.map((item) => (
              <Link key={item.id} href={item.href as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.event.name} / {item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </Link>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No open booking requests or draft/sent proposals. New vendor and client follow-ups will appear here with exact event context.</p>
            )}
          </div>
        </Card>

        <Card id="money-contract-alerts" className="scroll-mt-24 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-5 w-5 text-emerald-700" />Money / contract alerts</h2>
          <p className="mt-2 text-sm text-slate-600">Private-pilot status only; this does not enable live charges or payouts.</p>
          <div className="mt-4 space-y-3">
            {dashboard.moneyAlerts.length > 0 ? dashboard.moneyAlerts.map((item) => (
              <Link key={item.id} href={item.href as Route} className="block rounded-xl border border-emerald-100 bg-emerald-50 p-3 hover:border-emerald-200">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-700">{item.event.name} / {item.status} / {formatMoney(item.amountCents)}</p>
              </Link>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No contract or payment items need attention. When proposals, signatures, deposits, or held funds exist, they will show here.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-indigo-700" />Business setup status</h2>
          <p className="mt-2 text-sm text-slate-600">Keep the planner business ready for invite-only clients without hiding unfinished setup work.</p>
          <div className="mt-4 space-y-3">
            {setupItems.map((item) => (
              <Link key={item.label} href={item.href as Route} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                {item.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-600">{item.action}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );

  const Panel = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: typeof Briefcase;
    children: ReactNode;
  }) => (
    <section className="space-y-4 rounded-2xl bg-[color:var(--oh-surface)] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><Icon className="h-5 w-5" /></span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );

  const Main = () => {
    switch (uiRoute) {
      case "overview":
        return <Overview />;
      case "services":
        return (
          <Panel title="Services & packages" icon={Briefcase}>
            <p className="text-sm text-slate-600">Published marketplace services and package readiness for planner-led events.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {listings.length > 0 ? listings.map((listing) => (
                <Card key={listing.id} className="p-4">
                  <p className="font-semibold">{listing.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{listing.type} / {listing.category}{listing.city ? ` / ${listing.city}, ${listing.state}` : ""}</p>
                </Card>
              )) : (
                <Card className="p-4">
                  <p className="font-semibold">No marketplace services published yet.</p>
                  <p className="mt-1 text-sm text-slate-600">Create or update planner offerings so clients understand what your team can deliver.</p>
                </Card>
              )}
            </div>
            <Button asChild><Link href={"/marketplace/manage" as Route}>Manage services</Link></Button>
          </Panel>
        );
      case "availability":
        return (
          <Panel title="Availability & booking" icon={Calendar}>
            <p className="text-sm text-slate-600">Upcoming event dates and booking pressure across the agency.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.nextEvents.length > 0 ? dashboard.nextEvents.map((event) => (
                <Link key={event.id} href={`/pro/planner/vault/${event.slug}` as Route} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                  <p className="font-semibold text-slate-900">{event.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(event.startAt)} / {event.status.replace(/_/g, " ")}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No upcoming active event dates are loaded. Create or reopen events to populate agency availability.</p>
              )}
            </div>
          </Panel>
        );
      case "payments":
        return (
          <Panel title="Payments & contracts" icon={CreditCard}>
            <p className="text-sm text-slate-600">Private-pilot money state: proposals, contracts, deposits, and held-fund readiness. No live-payment activation is added here.</p>
            <div className="space-y-3">
              {dashboard.moneyAlerts.length > 0 ? dashboard.moneyAlerts.map((item) => (
                <Link key={item.id} href={item.href as Route} className="block rounded-xl border border-emerald-100 bg-emerald-50 p-4 hover:border-emerald-200">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.event.name} / {item.status} / {formatMoney(item.amountCents)}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No proposal, contract, or payment state currently needs action.</p>
              )}
            </div>
          </Panel>
        );
      case "portfolio":
        return (
          <Panel title="Portfolio & branding" icon={ImageIcon}>
            <p className="text-sm text-slate-600">Planner profile, marketplace listing, and brand proof used by invite-only clients.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">{dashboard.publishedListings} published profile/listing record{dashboard.publishedListings === 1 ? "" : "s"}</p>
              <p className="mt-1 text-sm text-slate-600">Use the profile workflow to keep photos, service area, proof, and contact details current.</p>
            </div>
            <Button asChild><Link href={"/providers/onboarding?providerType=planner" as Route}>Update profile</Link></Button>
          </Panel>
        );
      case "settings":
        return (
          <Panel title="Settings" icon={Settings}>
            <p className="text-sm text-slate-600">Operational links for the planner business.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Button asChild variant="secondary"><Link href={"/messages" as Route}>Messages and follow-ups</Link></Button>
              <Button asChild variant="secondary"><Link href={"/help" as Route}>Help and support</Link></Button>
              <Button asChild variant="secondary"><Link href={"/app/billing/connect" as Route}>Billing connection status</Link></Button>
              <Button asChild variant="secondary"><Link href={"/professional-planner/setup" as Route}>Planner organization setup</Link></Button>
            </div>
          </Panel>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[color:var(--oh-bg)]">
      <ProPlannerHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1">
        <ProPlannerSidebar currentRoute={uiRoute} onRoute={setUiRoute} mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        <main className="flex-1 p-6">
          <Main />
        </main>
      </div>
    </div>
  );
}
