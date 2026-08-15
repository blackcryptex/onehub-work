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
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Role } from "@onehub/types/src/roles";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Folder,
  HeartHandshake,
  Image as ImageIcon,
  ListChecks,
  MessageSquare,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { EventActions } from "@/components/events/EventActions";

type UIRoute =
  | "overview"
  | "team"
  | "clients"
  | "vendors"
  | "timeline"
  | "contracts"
  | "payments"
  | "files"
  | "services"
  | "availability"
  | "portfolio"
  | "reports"
  | "settings";

type PlannerTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt: Date | string | null;
  assignee?: { id: string; name: string | null; email: string | null } | null;
};

type PlannerBookingRequest = {
  id: string;
  status: string;
  createdAt: Date | string;
  contactName: string;
  listing?: { id: string; title: string; type: string; category: string } | null;
};

type PlannerProposal = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  totalCents: number;
  contract?: { id: string; status: string } | null;
  milestones?: { id: string; status: string; amountCents: number; dueDate: Date | string | null }[];
  listing?: { id: string; title: string; type: string } | null;
};

type PlannerContract = {
  id: string;
  title: string;
  description?: string | null;
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
  milestones?: { id: string; title: string; dueAt: Date | string; done: boolean; order: number }[];
  stakeholders?: { id: string; role: string; user: { id: string; name: string | null; email: string | null } }[];
  media?: { id: string; url: string; caption: string | null; createdAt: Date | string }[];
  threads?: { id: string; subject: string; createdAt: Date | string; participants?: { email: string; roleHint: string | null }[]; messages?: { id: string; createdAt: Date | string }[] }[];
};

type PlannerListing = {
  id: string;
  title: string;
  type: string;
  category: string;
  city: string | null;
  state: string | null;
};

type PlannerVendorRelationship = {
  id: string;
  status: string;
  notes: string | null;
  reliability: number | null;
  lastContactAt: Date | string | null;
  nextFollowUpAt: Date | string | null;
  updatedAt: Date | string;
  listing: { id: string; title: string; type: string; category: string; city: string | null; state: string | null };
};

type PlannerNotification = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  createdAt: Date | string;
};

type PlannerMember = {
  id: string;
  role: string;
  staffRole: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string | null };
  team: { id: string; name: string } | null;
};

type PlannerInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  acceptPath?: string;
};

interface ProPlannerDashboardProps {
  orgId: string;
  orgName: string;
  events: PlannerEvent[];
  userId: string;
  userRole: string;
  orgOwnerId: string;
  listings?: PlannerListing[];
  notifications?: PlannerNotification[];
  members?: PlannerMember[];
  invites?: PlannerInvite[];
  vendorRelationships?: PlannerVendorRelationship[];
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

function daysUntil(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function contactName(user: { name: string | null; email?: string | null }) {
  return user.name || user.email || "Unnamed contact";
}

export function ProPlannerDashboard({
  orgId,
  orgName,
  events,
  userId,
  userRole,
  orgOwnerId,
  listings = [],
  notifications = [],
  members = [],
  invites = [],
  vendorRelationships = [],
}: ProPlannerDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<PlannerEvent[]>(events);
  const [assistantEmail, setAssistantEmail] = useState("");
  const [pendingInvites, setPendingInvites] = useState<PlannerInvite[]>(invites);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [clientTaskTitle, setClientTaskTitle] = useState("");
  const [clientTaskEventId, setClientTaskEventId] = useState(events[0]?.id ?? "");
  const [clientTaskUserId, setClientTaskUserId] = useState("");
  const [clientTaskDueDate, setClientTaskDueDate] = useState("");
  const [clientTaskStatus, setClientTaskStatus] = useState<string | null>(null);
  const [clientTaskBusy, setClientTaskBusy] = useState(false);
  const [localVendorRelationships, setLocalVendorRelationships] = useState<PlannerVendorRelationship[]>(vendorRelationships);
  const [vendorRelationshipListingId, setVendorRelationshipListingId] = useState("");
  const [vendorRelationshipStatus, setVendorRelationshipStatus] = useState("PREFERRED");
  const [vendorRelationshipNotes, setVendorRelationshipNotes] = useState("");
  const [vendorRelationshipFollowUp, setVendorRelationshipFollowUp] = useState("");
  const [vendorRelationshipMessage, setVendorRelationshipMessage] = useState<string | null>(null);
  const [vendorRelationshipBusy, setVendorRelationshipBusy] = useState(false);

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
    const teamMembers = [
      ...members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: `${member.role}${member.staffRole ? ` / ${member.staffRole}` : ""}`,
        event: null as PlannerEvent | null,
      })),
      ...localEvents.flatMap((event) => [
        { id: event.createdBy.id, name: event.createdBy.name, email: null as string | null, role: "Lead planner", event },
        ...(event.tasks ?? [])
          .filter((task) => task.assignee)
          .map((task) => ({
            id: task.assignee!.id,
            name: task.assignee!.name,
            email: task.assignee!.email,
            role: `Task owner: ${task.title}`,
            event,
          })),
      ]),
    ].filter((member, index, all) => all.findIndex((candidate) => candidate.id === member.id && candidate.role === member.role && candidate.event?.id === member.event?.id) === index);
    const clients = localEvents.flatMap((event) =>
      (event.stakeholders ?? [])
        .filter((stakeholder) => stakeholder.role.toUpperCase().includes("CLIENT"))
        .map((stakeholder) => ({ id: stakeholder.id, userId: stakeholder.user.id, event, name: contactName(stakeholder.user), role: stakeholder.role })),
    );
    const waitingOnClientTasks = openTasks
      .filter((task) => {
        const description = (task.description ?? "").toLowerCase();
        const assigneeId = task.assignee?.id;
        const isClientAssignee = task.event.stakeholders?.some((stakeholder) => stakeholder.role.toUpperCase().includes("CLIENT") && stakeholder.user.id === assigneeId);
        return description.includes("waiting on client") || isClientAssignee;
      })
      .slice(0, 8);
    const derivedVendorRelationships = localEvents.flatMap((event) => [
      ...(event.bookingRequests ?? []).map((request) => ({
        id: `request-${request.id}`,
        event,
        listingId: request.listing?.id ?? null,
        name: request.listing?.title ?? request.contactName,
        status: request.status,
        detail: request.listing ? `${request.listing.type} / ${request.listing.category}` : request.contactName,
        href: `/pro/planner/vault/${event.slug}#workspace-requests-detail`,
      })),
      ...(event.proposals ?? []).map((proposal) => ({
        id: `proposal-vendor-${proposal.id}`,
        event,
        listingId: proposal.listing?.id ?? null,
        name: proposal.listing?.title ?? proposal.title,
        status: proposal.status,
        detail: `${proposal.title} / ${formatMoney(proposal.totalCents)}`,
        href: `/pro/planner/vault/${event.slug}#workspace-proposals-detail`,
      })),
    ]);
    const persistedVendorRelationships = localVendorRelationships.map((relationship) => ({
      id: `relationship-${relationship.id}`,
      event: null as PlannerEvent | null,
      listingId: relationship.listing.id,
      name: relationship.listing.title,
      status: relationship.status,
      detail: `${relationship.listing.type} / ${relationship.listing.category}${relationship.reliability ? ` / reliability ${relationship.reliability}/5` : ""}${relationship.nextFollowUpAt ? ` / follow up ${formatDate(relationship.nextFollowUpAt)}` : ""}`,
      href: "/explore/vendors",
      notes: relationship.notes,
    }));
    const vendorRelationshipOptions = derivedVendorRelationships
      .filter((relationship) => relationship.listingId)
      .filter((relationship, index, all) => all.findIndex((candidate) => candidate.listingId === relationship.listingId) === index);
    const vendorRelationshipQueue = [...persistedVendorRelationships, ...derivedVendorRelationships]
      .filter((relationship, index, all) => all.findIndex((candidate) => candidate.listingId ? candidate.listingId === relationship.listingId && candidate.status === relationship.status : candidate.id === relationship.id) === index)
      .slice(0, 10);
    const timelineRisks = localEvents.flatMap((event) => [
      ...(event.tasks ?? [])
        .filter((task) => isOpenTask(task.status))
        .map((task) => ({ id: `task-risk-${task.id}`, event, title: task.title, detail: `Task due ${formatDate(task.dueAt)}`, href: `/pro/planner/vault/${event.slug}#event-workspace` })),
      ...(event.milestones ?? [])
        .filter((milestone) => !milestone.done)
        .map((milestone) => ({ id: `milestone-risk-${milestone.id}`, event, title: milestone.title, detail: `Milestone due ${formatDate(milestone.dueAt)}`, href: `/pro/planner/vault/${event.slug}#event-workspace` })),
      ...(daysUntil(event.startAt) !== null && daysUntil(event.startAt)! <= 30
        ? [{ id: `event-week-${event.id}`, event, title: "Event day readiness", detail: `${daysUntil(event.startAt)} days until event`, href: `/pro/planner/vault/${event.slug}` }]
        : []),
    ]).slice(0, 10);
    const fileSignals = localEvents.flatMap((event) => [
      ...(event.media ?? []).map((media) => ({ id: media.id, event, title: media.caption || "Event file/media", detail: media.url, href: `/pro/planner/vault/${event.slug}#event-workspace` })),
      ...(event.threads ?? [])
        .filter((thread) => thread.subject.toLowerCase().includes("file") || thread.subject.toLowerCase().includes("document"))
        .map((thread) => ({ id: `thread-file-${thread.id}`, event, title: thread.subject, detail: `${thread.participants?.length ?? 0} participants`, href: `/messages/${thread.id}` })),
    ]).slice(0, 10);
    const reportMetrics = {
      pipelineCents: localEvents.flatMap((event) => event.proposals ?? []).reduce((sum, proposal) => sum + proposal.totalCents, 0),
      openContracts: localEvents.flatMap((event) => event.contracts ?? []).filter((contract) => isMoneyAttentionStatus(contract.status)).length,
      vendorTouches: vendorRelationships.length,
      taskLoad: openTasks.length,
    };

    return {
      activeEvents,
      sortedEvents,
      nextEvents: eventDates,
      openTasks,
      followUps,
      moneyAlerts,
      unreadNotifications,
      publishedListings: listings.length,
      teamMembers,
      clients,
      waitingOnClientTasks,
      vendorRelationships: vendorRelationshipQueue,
      vendorRelationshipOptions,
      timelineRisks,
      fileSignals,
      reportMetrics,
    };
  }, [listings.length, localEvents, localVendorRelationships, members, notifications, vendorRelationships.length]);

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

  const createAssistantInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteStatus(null);
    const email = assistantEmail.trim();
    if (!email) return;
    setInviteBusy(true);
    try {
      const response = await fetch("/api/pro-planner/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email, role: "MEMBER" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Could not create assistant invite");
      }
      setPendingInvites((current) => [payload.invite, ...current]);
      setAssistantEmail("");
      setInviteStatus("Assistant invite created. Share the generated invite path from the pending invite list; email delivery is not automatic yet.");
    } catch (error) {
      setInviteStatus(error instanceof Error ? error.message : "Could not create assistant invite");
    } finally {
      setInviteBusy(false);
    }
  };

  const createClientTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientTaskStatus(null);
    const eventId = clientTaskEventId || localEvents[0]?.id;
    const title = clientTaskTitle.trim();
    if (!eventId || !title) return;
    setClientTaskBusy(true);
    try {
      const response = await fetch("/api/pro-planner/clients/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          eventId,
          title,
          clientUserId: clientTaskUserId || undefined,
          dueAt: clientTaskDueDate ? new Date(`${clientTaskDueDate}T12:00:00.000Z`).toISOString() : undefined,
          priority: "HIGH",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Could not create client follow-up task");
      }
      setLocalEvents((current) => current.map((plannerEvent) => {
        if (plannerEvent.id !== eventId) return plannerEvent;
        const task = payload.task as PlannerTask;
        return { ...plannerEvent, tasks: [task, ...(plannerEvent.tasks ?? [])] };
      }));
      setClientTaskTitle("");
      setClientTaskDueDate("");
      setClientTaskStatus("Client follow-up task created and added to the event task queue.");
    } catch (error) {
      setClientTaskStatus(error instanceof Error ? error.message : "Could not create client follow-up task");
    } finally {
      setClientTaskBusy(false);
    }
  };

  const saveVendorRelationship = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVendorRelationshipMessage(null);
    if (!vendorRelationshipListingId) return;
    setVendorRelationshipBusy(true);
    try {
      const response = await fetch("/api/pro-planner/vendors/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          listingId: vendorRelationshipListingId,
          status: vendorRelationshipStatus,
          notes: vendorRelationshipNotes || undefined,
          nextFollowUpAt: vendorRelationshipFollowUp ? new Date(`${vendorRelationshipFollowUp}T12:00:00.000Z`).toISOString() : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Could not save vendor relationship");
      }
      setLocalVendorRelationships((current) => [payload.relationship, ...current.filter((relationship) => relationship.listing.id !== payload.relationship.listing.id)]);
      setVendorRelationshipNotes("");
      setVendorRelationshipFollowUp("");
      setVendorRelationshipMessage("Vendor relationship saved with status, note, and follow-up state.");
    } catch (error) {
      setVendorRelationshipMessage(error instanceof Error ? error.message : "Could not save vendor relationship");
    } finally {
      setVendorRelationshipBusy(false);
    }
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
      case "team":
        return (
          <Panel title="Team & assistant operations" icon={Users}>
            <p className="text-sm text-slate-600">Agency roster, task owners, and assistant-safe operating boundaries across active events.</p>
            <form onSubmit={createAssistantInvite} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <label htmlFor="assistant-email" className="text-sm font-semibold text-slate-900">Invite assistant or co-planner</label>
              <p id="assistant-invite-help" className="mt-1 text-xs text-slate-600">Enter the assistant’s email address to create a guarded organization invite.</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="assistant-email"
                  type="email"
                  value={assistantEmail}
                  onChange={(event) => setAssistantEmail(event.target.value)}
                  aria-describedby="assistant-invite-help"
                  className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                />
                <Button type="submit" disabled={inviteBusy || !assistantEmail.trim()}>{inviteBusy ? "Creating..." : "Create invite"}</Button>
              </div>
              {inviteStatus && <p className="mt-2 text-sm text-slate-700">{inviteStatus}</p>}
            </form>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.teamMembers.length > 0 ? dashboard.teamMembers.map((member) => {
                const href = member.event ? `/pro/planner/vault/${member.event.slug}#event-workspace` : "/professional-planner/setup";
                const context = member.event ? member.event.name : orgName;
                return (
                  <Link key={`${member.event?.id ?? "org"}-${member.id}-${member.role}`} href={href as Route} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                    <p className="font-semibold text-slate-900">{contactName(member)}</p>
                    <p className="mt-1 text-sm text-slate-600">{context} / {member.role}</p>
                  </Link>
                );
              }) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No assistant or task owner records are loaded yet. Invite coordinators and assign event tasks before delegating planner work.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Pending assistant invites</h3>
              {pendingInvites.length > 0 ? pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{invite.email}</p>
                  <p className="mt-1 text-sm text-slate-600">{invite.role} / expires {formatDate(invite.expiresAt)}</p>
                  {invite.acceptPath && <p className="mt-1 break-all text-xs text-slate-500">Invite path: {invite.acceptPath}</p>}
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No pending assistant invites. New invites appear here after they are created.</p>
              )}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Assistant safety: coordinators can own tasks and event prep, but contract, payment, dispute, and payout controls stay restricted until explicit permissions exist.
            </div>
            <Button asChild><Link href={"/professional-planner/setup" as Route}>Review agency setup</Link></Button>
          </Panel>
        );
      case "clients":
        return (
          <Panel title="Client command center" icon={HeartHandshake}>
            <p className="text-sm text-slate-600">Client contacts, waiting-on-client work, approvals, and event communication context.</p>
            <form onSubmit={createClientTask} className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <h3 className="font-semibold text-slate-900">Create waiting-on-client task</h3>
              <p className="mt-1 text-xs text-slate-600">Turn a client decision, approval, document, or response into a real event task.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-800">
                  Event
                  <select value={clientTaskEventId} onChange={(event) => { setClientTaskEventId(event.target.value); setClientTaskUserId(""); }} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    {localEvents.map((plannerEvent) => <option key={plannerEvent.id} value={plannerEvent.id}>{plannerEvent.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Client contact
                  <select value={clientTaskUserId} onChange={(event) => setClientTaskUserId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">Unassigned client follow-up</option>
                    {dashboard.clients.filter((client) => client.event.id === clientTaskEventId).map((client) => (
                      <option key={`${client.event.id}-${client.userId}`} value={client.userId}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800 md:col-span-2">
                  What is needed from the client?
                  <input
                    value={clientTaskTitle}
                    onChange={(event) => setClientTaskTitle(event.target.value)}
                    aria-label="Client task title"
                    className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Due date
                  <input
                    type="date"
                    value={clientTaskDueDate}
                    onChange={(event) => setClientTaskDueDate(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </label>
              </div>
              <Button type="submit" className="mt-3" disabled={clientTaskBusy || !clientTaskEventId || !clientTaskTitle.trim()}>{clientTaskBusy ? "Creating..." : "Add client task"}</Button>
              {clientTaskStatus && <p className="mt-2 text-sm text-slate-700">{clientTaskStatus}</p>}
            </form>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.clients.length > 0 ? dashboard.clients.map((client) => (
                <Link key={`${client.event.id}-${client.id}`} href={`/pro/planner/vault/${client.event.slug}` as Route} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                  <p className="font-semibold text-slate-900">{client.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{client.event.name} / {client.role.replace(/_/g, " ")}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No client stakeholder records are loaded. Add client access from the event command center to track approvals and decisions.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Waiting on client</h3>
              {dashboard.waitingOnClientTasks.length > 0 ? dashboard.waitingOnClientTasks.map((task) => (
                <Link key={task.id} href={`/pro/planner/vault/${task.event.slug}#event-workspace` as Route} className="block rounded-xl border border-rose-100 bg-rose-50 p-3 hover:border-rose-200">
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs text-rose-900">{task.event.name} / due {formatDate(task.dueAt)}{task.assignee ? ` / ${contactName(task.assignee)}` : ""}</p>
                </Link>
              )) : dashboard.unreadNotifications.length > 0 ? dashboard.unreadNotifications.slice(0, 4).map((notification) => (
                <Link key={notification.id} href={(notification.link || "/notifications") as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  {notification.body && <p className="mt-1 text-xs text-slate-600">{notification.body}</p>}
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No waiting-on-client tasks or unread client/action notifications are loaded.</p>
              )}
            </div>
          </Panel>
        );
      case "vendors":
        return (
          <Panel title="Vendor & venue relationship hub" icon={Store}>
            <p className="text-sm text-slate-600">Shortlist, booking request, proposal, preferred status, caution notes, and relationship movement across events.</p>
            <form onSubmit={saveVendorRelationship} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <h3 className="font-semibold text-slate-900">Save vendor relationship note</h3>
              <p className="mt-1 text-xs text-slate-600">Mark a vendor or venue as preferred, active, watchlist, or do-not-use for this planner organization.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-800">
                  Vendor or venue
                  <select value={vendorRelationshipListingId} onChange={(event) => setVendorRelationshipListingId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="">Select from active requests/proposals</option>
                    {dashboard.vendorRelationshipOptions.map((vendor) => <option key={vendor.listingId ?? vendor.id} value={vendor.listingId ?? ""}>{vendor.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Relationship status
                  <select value={vendorRelationshipStatus} onChange={(event) => setVendorRelationshipStatus(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    <option value="PREFERRED">Preferred</option>
                    <option value="ACTIVE">Active</option>
                    <option value="WATCHLIST">Watchlist / caution</option>
                    <option value="DO_NOT_USE">Do not use</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Next follow-up
                  <input type="date" value={vendorRelationshipFollowUp} onChange={(event) => setVendorRelationshipFollowUp(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-sm font-medium text-slate-800 md:col-span-2">
                  Relationship note
                  <textarea value={vendorRelationshipNotes} onChange={(event) => setVendorRelationshipNotes(event.target.value)} aria-label="Vendor relationship note" className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <Button type="submit" className="mt-3" disabled={vendorRelationshipBusy || !vendorRelationshipListingId}>{vendorRelationshipBusy ? "Saving..." : "Save relationship"}</Button>
              {vendorRelationshipMessage && <p className="mt-2 text-sm text-slate-700">{vendorRelationshipMessage}</p>}
            </form>
            <div className="space-y-3">
              {dashboard.vendorRelationships.length > 0 ? dashboard.vendorRelationships.map((vendor) => (
                <Link key={vendor.id} href={vendor.href as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                  <p className="font-semibold text-slate-900">{vendor.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{vendor.event ? `${vendor.event.name} / ` : "Relationship record / "}{vendor.status.replace(/_/g, " ")} / {vendor.detail}</p>
                  {"notes" in vendor && vendor.notes && <p className="mt-2 text-xs text-slate-500">{vendor.notes}</p>}
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No vendor or venue requests are loaded. Source providers from an event command center to build the relationship queue.</p>
              )}
            </div>
            <Button asChild><Link href={"/explore/vendors" as Route}>Explore vendors and venues</Link></Button>
          </Panel>
        );
      case "timeline":
        return (
          <Panel title="Timeline, milestones & readiness" icon={ClipboardList}>
            <p className="text-sm text-slate-600">Critical dates, near-term tasks, milestone risk, and event-day readiness across active events.</p>
            <div className="space-y-3">
              {dashboard.timelineRisks.length > 0 ? dashboard.timelineRisks.map((risk) => (
                <Link key={risk.id} href={risk.href as Route} className="block rounded-xl border border-amber-100 bg-amber-50 p-4 hover:border-amber-200">
                  <p className="font-semibold text-slate-900">{risk.title}</p>
                  <p className="mt-1 text-sm text-amber-900">{risk.event.name} / {risk.detail}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No near-term timeline risks are loaded. Upcoming tasks, milestones, and event-day readiness warnings will appear here.</p>
              )}
            </div>
            <Button asChild><Link href={"/calendar" as Route}>Open calendar</Link></Button>
          </Panel>
        );
      case "contracts":
        return (
          <Panel title="Contracts command center" icon={FileText}>
            <p className="text-sm text-slate-600">Signature, proposal, contract, and readiness state across all planner events.</p>
            <div className="space-y-3">
              {dashboard.moneyAlerts.length > 0 ? dashboard.moneyAlerts.map((item) => (
                <Link key={`contract-${item.id}`} href={item.href as Route} className="block rounded-xl border border-emerald-100 bg-emerald-50 p-4 hover:border-emerald-200">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.event.name} / {item.status} / {formatMoney(item.amountCents)}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No contracts or proposals currently need signature/payment readiness attention.</p>
              )}
            </div>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Trust rule: this panel surfaces status only. It does not approve contracts, release funds, change Stripe, or bypass admin oversight.</p>
          </Panel>
        );
      case "files":
        return (
          <Panel title="Files & documents" icon={ImageIcon}>
            <p className="text-sm text-slate-600">Event media, document-thread signals, floorplans, proposal files, and vendor documents when attached to event records.</p>
            <div className="space-y-3">
              {dashboard.fileSignals.length > 0 ? dashboard.fileSignals.map((file) => (
                <Link key={file.id} href={file.href as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                  <p className="font-semibold text-slate-900">{file.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{file.event.name} / {file.detail}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No event file or document signals are loaded. Uploads, media, and document-thread activity will appear here once attached to events.</p>
              )}
            </div>
          </Panel>
        );
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
      case "reports":
        return (
          <Panel title="Reports & business intelligence" icon={BarChart3}>
            <p className="text-sm text-slate-600">Agency workload, pipeline, contract risk, and vendor movement calculated from real OneHub records.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Revenue pipeline</p><p className="mt-2 text-2xl font-semibold">{formatMoney(dashboard.reportMetrics.pipelineCents)}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Open contracts</p><p className="mt-2 text-2xl font-semibold">{dashboard.reportMetrics.openContracts}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Vendor touches</p><p className="mt-2 text-2xl font-semibold">{dashboard.reportMetrics.vendorTouches}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Open task load</p><p className="mt-2 text-2xl font-semibold">{dashboard.reportMetrics.taskLoad}</p></Card>
            </div>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Reports are scoped to this planner organization and computed from events, proposals, contracts, booking requests, and tasks.</p>
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
