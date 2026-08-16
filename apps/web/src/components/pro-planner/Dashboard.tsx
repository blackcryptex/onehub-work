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
  milestones?: { id: string; title?: string; status: string; amountCents: number; dueDate: Date | string | null }[];
  listing?: { id: string; title: string; type: string } | null;
};

type PlannerContract = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  buyerId?: string | null;
  sellerId?: string | null;
  signatures?: { id: string; signedAt: Date | string | null; signerEmail: string; signerName: string }[];
  paymentIntents?: { id: string; status: string; fundedAt: Date | string | null; amountCents: number; currency?: string; milestone?: { id: string; title: string; status: string; dueDate: Date | string | null } | null }[];
};

type PlannerThreadMessage = {
  id: string;
  createdAt: Date | string;
  bodyMd?: string | null;
  attachments?: unknown;
};

type PlannerThread = {
  id: string;
  subject: string;
  createdAt: Date | string;
  participants?: { email: string; roleHint: string | null }[];
  messages?: PlannerThreadMessage[];
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
  threads?: PlannerThread[];
};

type PlannerListing = {
  id: string;
  title: string;
  type: string;
  category: string;
  description?: string | null;
  minGuests?: number | null;
  maxGuests?: number | null;
  priceTier?: number | null;
  city: string | null;
  state: string | null;
  offers?: { id: string; name: string; priceCents: number | null; unit: string | null }[];
  availSlots?: { id: string; startAt: Date | string; endAt: Date | string; status: string; note: string | null }[];
  bookingRequests?: { id: string; status: string; startAt: Date | string; endAt: Date | string; guests: number | null; quoteCents: number | null; event: { id: string; name: string; slug: string } }[];
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
  return ["DRAFT", "SENT", "APPROVED", "OUT_FOR_SIGNATURE", "PARTIALLY_SIGNED", "REQUIRES_PAYMENT", "PROCESSING", "PENDING", "FAILED"].includes(status.toUpperCase());
}

function isPaymentAtRiskStatus(status: string) {
  return ["REQUIRES_PAYMENT", "PROCESSING", "FAILED"].includes(status.toUpperCase());
}

function signatureProgress(contract: PlannerContract) {
  const signed = (contract.signatures ?? []).filter((signature) => Boolean(signature.signedAt)).length;
  const expected = Math.max(2, contract.signatures?.length ?? 0);
  return { signed, expected };
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

function documentKind(value: string) {
  const text = value.toLowerCase();
  if (text.includes("contract") || text.includes("agreement") || text.includes("signature")) return "contract";
  if (text.includes("proposal") || text.includes("quote") || text.includes("payment")) return "proposal";
  if (text.includes("floor") || text.includes("layout") || text.includes("seating") || text.includes("diagram")) return "floorplan";
  if (text.includes("vendor") || text.includes("venue") || text.includes("certificate") || text.includes("insurance") || text.includes("coi") || text.includes("rider") || text.includes("menu")) return "vendor";
  return "general";
}

function isInternalThread(thread: PlannerThread) {
  const text = `${thread.subject} ${(thread.messages ?? []).map((message) => message.bodyMd ?? "").join(" ")}`.toLowerCase();
  const internalParticipant = (thread.participants ?? []).some((participant) => (participant.roleHint ?? "").toLowerCase().includes("internal"));
  return internalParticipant || text.includes("internal") || text.includes("planner-only") || text.includes("private note");
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
  const [localListings, setLocalListings] = useState<PlannerListing[]>(listings);
  const [availabilityListingId, setAvailabilityListingId] = useState(listings[0]?.id ?? "");
  const [availabilityStartDate, setAvailabilityStartDate] = useState("");
  const [availabilityEndDate, setAvailabilityEndDate] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("AVAILABLE");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [timelineMilestoneEventId, setTimelineMilestoneEventId] = useState(events[0]?.id ?? "");
  const [timelineMilestoneTitle, setTimelineMilestoneTitle] = useState("");
  const [timelineMilestoneDueDate, setTimelineMilestoneDueDate] = useState("");
  const [timelineMilestoneStatus, setTimelineMilestoneStatus] = useState<string | null>(null);
  const [timelineMilestoneBusy, setTimelineMilestoneBusy] = useState(false);
  const [internalNoteEventId, setInternalNoteEventId] = useState(events[0]?.id ?? "");
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const [internalNoteStatus, setInternalNoteStatus] = useState<string | null>(null);
  const [internalNoteBusy, setInternalNoteBusy] = useState(false);

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
    const contractQueue = localEvents.flatMap((event) => (event.contracts ?? []).map((contract) => {
      const progress = signatureProgress(contract);
      const amountCents = contract.paymentIntents?.reduce((sum, intent) => sum + intent.amountCents, 0) ?? 0;
      const unpaidCents = contract.paymentIntents?.filter((intent) => intent.status.toUpperCase() !== "SUCCEEDED").reduce((sum, intent) => sum + intent.amountCents, 0) ?? 0;
      const failedPayments = contract.paymentIntents?.filter((intent) => intent.status.toUpperCase() === "FAILED").length ?? 0;
      return {
        id: contract.id,
        event,
        title: contract.title,
        status: contract.status,
        amountCents,
        unpaidCents,
        signedCount: progress.signed,
        expectedSignatures: progress.expected,
        failedPayments,
        href: `/contracts/${contract.id}`,
      };
    })).filter((contract) => isMoneyAttentionStatus(contract.status) || contract.unpaidCents > 0 || contract.failedPayments > 0).slice(0, 12);
    const paymentRiskQueue = localEvents.flatMap((event) => (event.contracts ?? []).flatMap((contract) => (contract.paymentIntents ?? [])
      .filter((intent) => isPaymentAtRiskStatus(intent.status))
      .map((intent) => ({
        id: intent.id,
        event,
        contract,
        title: intent.milestone?.title || contract.title,
        status: intent.status,
        amountCents: intent.amountCents,
        fundedAt: intent.fundedAt,
        dueAt: intent.milestone?.dueDate ?? null,
        href: `/contracts/${contract.id}`,
      })))).slice(0, 12);
    const proposalPaymentPlanQueue = localEvents.flatMap((event) => (event.proposals ?? [])
      .filter((proposal) => isMoneyAttentionStatus(proposal.status) || (proposal.milestones ?? []).some((milestone) => isMoneyAttentionStatus(milestone.status)))
      .map((proposal) => ({
        id: proposal.id,
        event,
        title: proposal.title,
        status: proposal.status,
        amountCents: proposal.totalCents,
        openMilestones: (proposal.milestones ?? []).filter((milestone) => isMoneyAttentionStatus(milestone.status)),
        href: `/pro/planner/vault/${event.slug}#workspace-proposals-detail`,
      }))).slice(0, 12);
    const moneyAtRiskCents = paymentRiskQueue.reduce((sum, item) => sum + item.amountCents, 0) + contractQueue.reduce((sum, item) => sum + item.unpaidCents, 0);
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
      ...(event.media ?? []).map((media) => ({ id: media.id, event, title: media.caption || "Event file/media", detail: media.url, href: `/pro/planner/vault/${event.slug}#event-workspace`, kind: documentKind(media.caption || media.url) })),
      ...(event.threads ?? [])
        .filter((thread) => thread.subject.toLowerCase().includes("file") || thread.subject.toLowerCase().includes("document"))
        .map((thread) => ({ id: `thread-file-${thread.id}`, event, title: thread.subject, detail: `${thread.participants?.length ?? 0} participants`, href: `/messages/${thread.id}`, kind: documentKind(thread.subject) })),
    ]).slice(0, 10);
    const documentBuckets = [
      {
        label: "Contract & proposal docs",
        items: fileSignals.filter((file) => file.kind === "contract" || file.kind === "proposal"),
        empty: "Contract packets, signed agreements, proposals, and payment exhibits will appear when attached to event records or message threads.",
      },
      {
        label: "Floorplans & layouts",
        items: fileSignals.filter((file) => file.kind === "floorplan" || file.kind === "layout"),
        empty: "Floorplans, layouts, seating diagrams, and room specs will appear here with event context.",
      },
      {
        label: "Vendor documents",
        items: fileSignals.filter((file) => file.kind === "vendor"),
        empty: "Vendor certificates, menus, rider docs, COIs, and proof files will appear here without leaking across events.",
      },
    ];
    const communicationThreads = localEvents.flatMap((event) => (event.threads ?? []).map((thread) => {
      const latestMessage = thread.messages?.[0];
      const internal = isInternalThread(thread);
      return {
        ...thread,
        event,
        latestBody: latestMessage?.bodyMd ?? "No messages yet",
        latestAt: latestMessage?.createdAt ?? thread.createdAt,
        internal,
        href: `/messages/${thread.id}`,
      };
    })).sort((left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime()).slice(0, 10);
    const messageTemplates = [
      { label: "Client approval reminder", detail: "Ask for a yes/no decision, deadline, and event impact before work stalls." },
      { label: "Vendor document request", detail: "Request COI, floorplan, menu, rider, or delivery document with upload/link instructions." },
      { label: "Week-of status check", detail: "Send a clear readiness check across client, vendor, venue, and assistant owners." },
    ];
    const followUpReminders = [...waitingOnClientTasks.slice(0, 3).map((task) => ({ id: `client-reminder-${task.id}`, title: task.title, detail: `${task.event.name} / client response needed` })), ...vendorRelationshipQueue.slice(0, 3).map((vendor) => ({ id: `vendor-reminder-${vendor.id}`, title: vendor.name, detail: vendor.detail }))].slice(0, 5);
    const nextActions = [
      ...waitingOnClientTasks.slice(0, 2).map((task) => ({
        id: `next-client-${task.id}`,
        label: "Client approval reminder",
        event: task.event,
        detail: `${task.title} needs a clear owner/date follow-up before planner work stalls.`,
        href: `/pro/planner/vault/${task.event.slug}#event-workspace`,
      })),
      ...localEvents.flatMap((event) => (event.proposals ?? [])
        .filter((proposal) => !proposal.contract)
        .map((proposal) => ({
          id: `next-contract-${proposal.id}`,
          label: "Missing contract or signature action",
          event,
          detail: `${proposal.title} has proposal value ${formatMoney(proposal.totalCents)} and needs contract/signature movement before booking confidence.`,
          href: `/pro/planner/vault/${event.slug}#workspace-proposals-detail`,
        }))).slice(0, 2),
      ...localEvents.flatMap((event) => (event.proposals ?? [])
        .filter((proposal) => (proposal.milestones ?? []).some((milestone) => isMoneyAttentionStatus(milestone.status)))
        .map((proposal) => ({
          id: `next-payment-${proposal.id}`,
          label: "Payment plan check",
          event,
          detail: `${proposal.title} has ${(proposal.milestones ?? []).filter((milestone) => isMoneyAttentionStatus(milestone.status)).length} open payment milestone${(proposal.milestones ?? []).filter((milestone) => isMoneyAttentionStatus(milestone.status)).length === 1 ? "" : "s"}.`,
          href: `/pro/planner/vault/${event.slug}#workspace-payment-detail`,
        }))).slice(0, 2),
      ...derivedVendorRelationships.filter((vendor) => ["PENDING", "SENT", "DRAFT"].includes(vendor.status.toUpperCase())).slice(0, 2).map((vendor) => ({
        id: `next-vendor-${vendor.id}`,
        label: "Late vendor response check",
        event: vendor.event,
        detail: `${vendor.name} is still ${vendor.status}; confirm next response deadline.`,
        href: vendor.href,
      })),
      ...localEvents.filter((event) => daysUntil(event.startAt) !== null && daysUntil(event.startAt)! <= 14).slice(0, 2).map((event) => ({
        id: `next-weekof-${event.id}`,
        label: "Week-of readiness check",
        event,
        detail: `${event.name} is ${daysUntil(event.startAt)} days out; confirm run sheet, vendor arrival, and client decisions.`,
        href: `/pro/planner/vault/${event.slug}`,
      })),
    ].slice(0, 8);
    const serviceReadiness = localListings.map((listing) => {
      const openRequests = (listing.bookingRequests ?? []).filter((request) => isOpenRequest(request.status));
      const upcomingSlots = (listing.availSlots ?? []).filter((slot) => new Date(slot.endAt).getTime() >= Date.now());
      const missingItems = [
        !listing.description ? "description" : null,
        !listing.priceTier && !(listing.offers ?? []).length ? "pricing" : null,
        !upcomingSlots.length ? "availability" : null,
      ].filter(Boolean) as string[];
      return { listing, openRequests, upcomingSlots, missingItems, ready: missingItems.length === 0 };
    });
    const bookingPressure = localListings.flatMap((listing) => (listing.bookingRequests ?? []).map((request) => ({
      id: request.id,
      listing,
      status: request.status,
      startAt: request.startAt,
      endAt: request.endAt,
      guests: request.guests,
      quoteCents: request.quoteCents,
      event: request.event,
      href: `/pro/planner/vault/${request.event.slug}#workspace-vendors-detail`,
    }))).filter((request) => isOpenRequest(request.status)).slice(0, 12);
    const availabilityQueue = localListings.flatMap((listing) => (listing.availSlots ?? []).map((slot) => ({
      ...slot,
      listing,
    }))).filter((slot) => new Date(slot.endAt).getTime() >= Date.now()).sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()).slice(0, 12);
    const allProposals = localEvents.flatMap((event) => event.proposals ?? []);
    const allContracts = localEvents.flatMap((event) => event.contracts ?? []);
    const allBookingRequests = localEvents.flatMap((event) => event.bookingRequests ?? []);
    const bookedRevenueCents = allProposals
      .filter((proposal) => ["APPROVED", "ACCEPTED", "CONTRACTED", "PAID"].includes(proposal.status.toUpperCase()) || Boolean(proposal.contract))
      .reduce((sum, proposal) => sum + proposal.totalCents, 0);
    const outstandingPaymentCents = allContracts.flatMap((contract) => contract.paymentIntents ?? [])
      .filter((intent) => intent.status.toUpperCase() !== "SUCCEEDED")
      .reduce((sum, intent) => sum + intent.amountCents, 0);
    const workloadByMonth = sortedEvents.reduce<{ month: string; count: number }[]>((months, event) => {
      const month = new Date(event.startAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const existing = months.find((item) => item.month === month);
      if (existing) existing.count += 1;
      else months.push({ month, count: 1 });
      return months;
    }, []).slice(0, 6);
    const packagePerformance = localListings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      offers: listing.offers?.length ?? 0,
      requests: (listing.bookingRequests ?? []).length,
      quotedCents: (listing.bookingRequests ?? []).reduce((sum, request) => sum + (request.quoteCents ?? 0), 0),
    })).slice(0, 6);
    const acceptedInquiryCount = allBookingRequests.filter((request) => ["ACCEPTED", "APPROVED", "BOOKED", "COMPLETED"].includes(request.status.toUpperCase())).length;
    const inquiryConversionRate = allBookingRequests.length ? Math.round((acceptedInquiryCount / allBookingRequests.length) * 100) : 0;
    const reportMetrics = {
      pipelineCents: allProposals.reduce((sum, proposal) => sum + proposal.totalCents, 0),
      bookedRevenueCents,
      outstandingPaymentCents,
      openContracts: allContracts.filter((contract) => isMoneyAttentionStatus(contract.status)).length,
      moneyAtRiskCents,
      vendorTouches: vendorRelationships.length,
      serviceReadiness: serviceReadiness.filter((service) => service.ready).length,
      taskLoad: openTasks.length,
      workloadByMonth,
      packagePerformance,
      inquiryConversionRate,
      totalInquiries: allBookingRequests.length,
      acceptedInquiryCount,
    };

    return {
      activeEvents,
      sortedEvents,
      nextEvents: eventDates,
      openTasks,
      followUps,
      moneyAlerts,
      contractQueue,
      paymentRiskQueue,
      proposalPaymentPlanQueue,
      moneyAtRiskCents,
      serviceReadiness,
      bookingPressure,
      availabilityQueue,
      unreadNotifications,
      publishedListings: localListings.length,
      teamMembers,
      clients,
      waitingOnClientTasks,
      vendorRelationships: vendorRelationshipQueue,
      vendorRelationshipOptions,
      timelineRisks,
      fileSignals,
      documentBuckets,
      communicationThreads,
      messageTemplates,
      followUpReminders,
      nextActions,
      reportMetrics,
    };
  }, [localEvents, localListings, localVendorRelationships, members, notifications, vendorRelationships.length]);

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

  const createTimelineMilestone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTimelineMilestoneStatus(null);
    if (!timelineMilestoneTitle.trim() || !timelineMilestoneEventId || !timelineMilestoneDueDate) return;
    setTimelineMilestoneBusy(true);
    try {
      const response = await fetch("/api/pro-planner/timeline/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          eventId: timelineMilestoneEventId,
          title: timelineMilestoneTitle.trim(),
          dueAt: new Date(`${timelineMilestoneDueDate}T12:00:00.000Z`).toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Could not create timeline milestone");
      }
      setLocalEvents((current) => current.map((event) => event.id === timelineMilestoneEventId ? {
        ...event,
        milestones: [...(event.milestones ?? []), payload.milestone].sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()),
      } : event));
      setTimelineMilestoneTitle("");
      setTimelineMilestoneDueDate("");
      setTimelineMilestoneStatus("Timeline milestone added to event readiness.");
    } catch (error) {
      setTimelineMilestoneStatus(error instanceof Error ? error.message : "Could not create timeline milestone");
    } finally {
      setTimelineMilestoneBusy(false);
    }
  };

  const addAvailabilitySlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAvailabilityMessage(null);
    if (!availabilityListingId || !availabilityStartDate || !availabilityEndDate) return;
    setAvailabilityBusy(true);
    try {
      const response = await fetch("/api/pro-planner/availability/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          listingId: availabilityListingId,
          startAt: new Date(`${availabilityStartDate}T09:00:00.000Z`).toISOString(),
          endAt: new Date(`${availabilityEndDate}T17:00:00.000Z`).toISOString(),
          status: availabilityStatus,
          note: availabilityNote || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not add availability slot");
      setLocalListings((current) => current.map((listing) => listing.id === availabilityListingId ? {
        ...listing,
        availSlots: [...(listing.availSlots ?? []), payload.slot].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
      } : listing));
      setAvailabilityStartDate("");
      setAvailabilityEndDate("");
      setAvailabilityNote("");
      setAvailabilityMessage("Availability slot added to booking readiness.");
    } catch (error) {
      setAvailabilityMessage(error instanceof Error ? error.message : "Could not add availability slot");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const saveInternalNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInternalNoteStatus(null);
    const note = internalNoteBody.trim();
    const eventId = internalNoteEventId || localEvents[0]?.id;
    if (!eventId || !note) return;
    setInternalNoteBusy(true);
    try {
      const response = await fetch("/api/pro-planner/files/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, eventId, bodyMd: `Internal note: ${note}` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save internal note");
      const thread = payload.thread as PlannerThread;
      setLocalEvents((current) => current.map((plannerEvent) => plannerEvent.id === eventId ? {
        ...plannerEvent,
        threads: [thread, ...(plannerEvent.threads ?? []).filter((existing) => existing.id !== thread.id)],
      } : plannerEvent));
      setInternalNoteBody("");
      setInternalNoteStatus("Internal planner note saved to the event communication hub.");
    } catch (error) {
      setInternalNoteStatus(error instanceof Error ? error.message : "Could not save internal planner note");
    } finally {
      setInternalNoteBusy(false);
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

      <Card className="p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-indigo-700" />Planner next-action engine</h2>
            <p className="mt-1 text-sm text-slate-600">Deterministic guidance only: OneHub suggests next actions from real event, client, vendor, contract, payment, and timeline records. It does not send messages, approve contracts, release money, or fake AI decisions.</p>
          </div>
          <Button asChild size="sm" variant="secondary"><Link href={"/pro/planner/vault" as Route}>Open event work</Link></Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.nextActions.length > 0 ? dashboard.nextActions.map((action) => (
            <Link key={action.id} href={action.href as Route} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 hover:border-indigo-200">
              <p className="text-sm font-semibold text-slate-900">{action.label}</p>
              <p className="mt-1 text-xs text-indigo-900">{action.event.name}</p>
              <p className="mt-2 text-xs text-slate-600">{action.detail}</p>
            </Link>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No high-priority next actions are loaded. New client decisions, missing contracts, payment milestones, late vendor responses, or week-of risks will appear here.</p>
          )}
        </div>
      </Card>

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
            <p className="text-sm text-slate-600">Critical dates, near-term tasks, milestone risk, run-of-show prep, and event-day readiness across active events.</p>
            <form onSubmit={createTimelineMilestone} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <h3 className="font-semibold text-slate-900">Add timeline milestone</h3>
              <p className="mt-1 text-xs text-slate-600">Create real milestone records for walkthroughs, client approvals, vendor locks, rehearsals, and day-of readiness gates.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-800">
                  Event
                  <select value={timelineMilestoneEventId} onChange={(event) => setTimelineMilestoneEventId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                    {localEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Milestone title
                  <input value={timelineMilestoneTitle} onChange={(event) => setTimelineMilestoneTitle(event.target.value)} aria-label="Timeline milestone title" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Due date
                  <input type="date" value={timelineMilestoneDueDate} onChange={(event) => setTimelineMilestoneDueDate(event.target.value)} aria-label="Timeline milestone due date" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                </label>
              </div>
              <Button type="submit" className="mt-3" disabled={timelineMilestoneBusy || !timelineMilestoneTitle.trim() || !timelineMilestoneEventId || !timelineMilestoneDueDate}>{timelineMilestoneBusy ? "Adding..." : "Add milestone"}</Button>
              {timelineMilestoneStatus && <p className="mt-2 text-sm text-slate-700">{timelineMilestoneStatus}</p>}
            </form>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.nextEvents.map((event) => (
                <div key={`readiness-${event.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">{event.name}</p>
                  <p className="mt-1 text-sm text-slate-600">Event date {formatDate(event.startAt)} / {(event.milestones ?? []).filter((milestone) => !milestone.done).length} open milestones / {(event.tasks ?? []).filter((task) => isOpenTask(task.status)).length} open tasks</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">Run-of-show readiness</p>
                  <p className="mt-1 text-sm text-slate-600">{daysUntil(event.startAt) !== null && daysUntil(event.startAt)! <= 14 ? "Immediate run-of-show review required." : "Readiness is tracked from open tasks, milestones, and event date."}</p>
                </div>
              ))}
            </div>
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
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Contracts needing action</p><p className="mt-2 text-2xl font-semibold">{dashboard.contractQueue.length}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Payment risks</p><p className="mt-2 text-2xl font-semibold">{dashboard.paymentRiskQueue.length}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Money at risk</p><p className="mt-2 text-2xl font-semibold">{formatMoney(dashboard.moneyAtRiskCents)}</p></Card>
            </div>
            <div className="space-y-3">
              {dashboard.contractQueue.length > 0 ? dashboard.contractQueue.map((item) => (
                <Link key={`contract-${item.id}`} href={item.href as Route} className="block rounded-xl border border-emerald-100 bg-emerald-50 p-4 hover:border-emerald-200">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.event.name} / {item.status} / signatures {item.signedCount} of {item.expectedSignatures} / unpaid {formatMoney(item.unpaidCents)}</p>
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
            <p className="text-sm text-slate-600">Event file library, document review threads, internal planner notes, client-safe communication, templates, and follow-up reminders.</p>
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Document command center</p><p className="mt-2 text-2xl font-semibold">{dashboard.fileSignals.length}</p><p className="mt-1 text-xs text-slate-500">event-scoped docs loaded</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Open threads</p><p className="mt-2 text-2xl font-semibold">{dashboard.communicationThreads.length}</p><p className="mt-1 text-xs text-slate-500">event conversations</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Planner-only notes</p><p className="mt-2 text-2xl font-semibold">{dashboard.communicationThreads.filter((thread) => thread.internal).length}</p><p className="mt-1 text-xs text-slate-500">not client/vendor visible</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Reminder queue</p><p className="mt-2 text-2xl font-semibold">{dashboard.followUpReminders.length}</p><p className="mt-1 text-xs text-slate-500">client/vendor follow-ups</p></Card>
            </div>
            <form onSubmit={saveInternalNote} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <h3 className="font-semibold text-slate-900">Internal planner notes</h3>
              <p className="mt-1 text-xs text-slate-600">Internal notes stay planner-only in the Pro Planner hub and do not become client/vendor messages.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(180px,0.35fr)_minmax(0,1fr)]">
                <label className="text-sm font-medium text-slate-800">Event<select value={internalNoteEventId} onChange={(event) => setInternalNoteEventId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">{localEvents.map((plannerEvent) => <option key={plannerEvent.id} value={plannerEvent.id}>{plannerEvent.name}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-800">Internal planner note<input value={internalNoteBody} onChange={(event) => setInternalNoteBody(event.target.value)} aria-label="Internal planner note" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
              </div>
              <Button type="submit" className="mt-3" disabled={internalNoteBusy || !internalNoteEventId || !internalNoteBody.trim()}>{internalNoteBusy ? "Saving..." : "Save internal note"}</Button>
              {internalNoteStatus && <p className="mt-2 text-sm text-slate-700">{internalNoteStatus}</p>}
            </form>
            <div className="grid gap-4 xl:grid-cols-3">
              {dashboard.documentBuckets.map((bucket) => (
                <Card key={bucket.label} className="p-4">
                  <h3 className="font-semibold text-slate-900">{bucket.label}</h3>
                  <div className="mt-3 space-y-2">
                    {bucket.items.length > 0 ? bucket.items.map((file) => (
                      <Link key={`${bucket.label}-${file.id}`} href={file.href as Route} className="block rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-indigo-200">
                        <p className="text-sm font-semibold text-slate-900">{file.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{file.event.name} / {file.detail}</p>
                      </Link>
                    )) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">{bucket.empty}</p>}
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900">Communication hub</h3>
                <p className="mt-1 text-sm text-slate-600">Event-specific threads with visibility labels so internal planner notes stay separate from client/vendor communication.</p>
                <div className="mt-3 space-y-3">
                  {dashboard.communicationThreads.length > 0 ? dashboard.communicationThreads.map((thread) => (
                    <Link key={thread.id} href={thread.href as Route} className={`block rounded-xl border p-4 hover:border-indigo-200 ${thread.internal ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{thread.subject}</p>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${thread.internal ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{thread.internal ? "Internal planner-only" : "Client/vendor visible"}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{thread.event.name} / {thread.participants?.length ?? 0} participant{(thread.participants?.length ?? 0) === 1 ? "" : "s"}</p>
                      <p className="mt-1 text-xs text-slate-500">{thread.latestBody}</p>
                    </Link>
                  )) : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No event threads are loaded. Message threads created from requests, proposals, clients, and planner notes will appear here.</p>}
                </div>
              </Card>
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold text-slate-900">Message templates</h3>
                  <div className="mt-3 space-y-2">
                    {dashboard.messageTemplates.map((template) => <div key={template.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{template.label}</p><p className="mt-1 text-xs text-slate-600">{template.detail}</p></div>)}
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold text-slate-900">Follow-up reminders</h3>
                  <div className="mt-3 space-y-2">
                    {dashboard.followUpReminders.length > 0 ? dashboard.followUpReminders.map((reminder) => <div key={reminder.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{reminder.title}</p><p className="mt-1 text-xs text-slate-600">{reminder.detail}</p></div>) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">No client/vendor follow-up reminders are loaded.</p>}
                  </div>
                </Card>
              </div>
            </div>
          </Panel>
        );
      case "services":
        return (
          <Panel title="Services & packages" icon={Briefcase}>
            <p className="text-sm text-slate-600">Published marketplace services, pricing readiness, capacity, package offers, and booking pressure for planner-led events.</p>
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Published services</p><p className="mt-2 text-2xl font-semibold">{localListings.length}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Ready services</p><p className="mt-2 text-2xl font-semibold">{dashboard.serviceReadiness.filter((service) => service.ready).length}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Open booking requests</p><p className="mt-2 text-2xl font-semibold">{dashboard.bookingPressure.length}</p></Card>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.serviceReadiness.length > 0 ? dashboard.serviceReadiness.map(({ listing, openRequests, upcomingSlots, missingItems, ready }) => (
                <Card key={listing.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{listing.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{listing.type} / {listing.category}{listing.city ? ` / ${listing.city}, ${listing.state}` : ""}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{ready ? "Ready" : "Needs setup"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Capacity {listing.minGuests ?? "min pending"}–{listing.maxGuests ?? "max pending"} / price tier {listing.priceTier ?? "pending"}</p>
                  <p className="mt-1 text-sm text-slate-600">{(listing.offers ?? []).length} package offer{(listing.offers ?? []).length === 1 ? "" : "s"} / {upcomingSlots.length} availability slot{upcomingSlots.length === 1 ? "" : "s"} / {openRequests.length} open request{openRequests.length === 1 ? "" : "s"}</p>
                  {(listing.offers ?? []).length > 0 && <p className="mt-1 text-xs text-slate-500">Packages: {(listing.offers ?? []).map((offer) => offer.name).join(", ")}</p>}
                  {missingItems.length > 0 && <p className="mt-2 text-xs text-amber-800">Missing: {missingItems.join(", ")}</p>}
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
            <p className="text-sm text-slate-600">Upcoming event dates, service availability, holds, and booking pressure across the agency.</p>
            <form onSubmit={addAvailabilitySlot} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <h3 className="font-semibold text-slate-900">Add availability or booking hold</h3>
              <p className="mt-1 text-xs text-slate-600">Publish planner availability or hold dates for a service/package. This does not charge clients or confirm bookings.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-800">Service<select value={availabilityListingId} onChange={(event) => setAvailabilityListingId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">{localListings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-800">Start date<input type="date" value={availabilityStartDate} onChange={(event) => setAvailabilityStartDate(event.target.value)} aria-label="Availability start date" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
                <label className="text-sm font-medium text-slate-800">End date<input type="date" value={availabilityEndDate} onChange={(event) => setAvailabilityEndDate(event.target.value)} aria-label="Availability end date" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
                <label className="text-sm font-medium text-slate-800">Status<select value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="AVAILABLE">Available</option><option value="HOLD">Hold</option><option value="BOOKED">Booked</option><option value="UNAVAILABLE">Unavailable</option></select></label>
              </div>
              <label className="mt-3 block text-sm font-medium text-slate-800">Availability note<input value={availabilityNote} onChange={(event) => setAvailabilityNote(event.target.value)} aria-label="Availability note" className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label>
              <Button type="submit" className="mt-3" disabled={availabilityBusy || !availabilityListingId || !availabilityStartDate || !availabilityEndDate}>{availabilityBusy ? "Adding..." : "Add availability"}</Button>
              {availabilityMessage && <p className="mt-2 text-sm text-slate-700">{availabilityMessage}</p>}
            </form>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboard.availabilityQueue.length > 0 ? dashboard.availabilityQueue.map((slot) => (
                <Card key={slot.id} className="p-4">
                  <p className="font-semibold text-slate-900">{slot.listing.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatDate(slot.startAt)}–{formatDate(slot.endAt)} / {slot.status.replace(/_/g, " ")}</p>
                  {slot.note && <p className="mt-2 text-xs text-slate-500">{slot.note}</p>}
                </Card>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No service availability slots are loaded. Add availability or booking holds to make scheduling capacity visible.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Booking pressure</h3>
              {dashboard.bookingPressure.length > 0 ? dashboard.bookingPressure.map((request) => (
                <Link key={request.id} href={request.href as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-200">
                  <p className="font-semibold text-slate-900">{request.listing.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.event.name} / {request.status} / {formatDate(request.startAt)}{request.quoteCents ? ` / quote ${formatMoney(request.quoteCents)}` : ""}</p>
                </Link>
              )) : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No open booking requests are loaded for planner services.</p>}
            </div>
          </Panel>
        );
      case "payments":
        return (
          <Panel title="Payments & contracts" icon={CreditCard}>
            <p className="text-sm text-slate-600">Private-pilot money state: proposals, contracts, deposits, and held-fund readiness. No live-payment activation is added here.</p>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Money-at-risk visibility</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(dashboard.moneyAtRiskCents)}</p>
              <p className="mt-1 text-sm text-red-900">Calculated from unpaid, failed, and processing payment records only. No charge, refund, payout, or release action is exposed.</p>
            </div>
            <div className="space-y-3">
              {dashboard.paymentRiskQueue.length > 0 ? dashboard.paymentRiskQueue.map((item) => (
                <Link key={item.id} href={item.href as Route} className="block rounded-xl border border-red-100 bg-red-50 p-4 hover:border-red-200">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-red-900">{item.event.name} / {item.contract.title} / {item.status} / {formatMoney(item.amountCents)}{item.dueAt ? ` / due ${formatDate(item.dueAt)}` : ""}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No payment records currently show unpaid, processing, or failed risk.</p>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Proposal payment plans</h3>
              {dashboard.proposalPaymentPlanQueue.length > 0 ? dashboard.proposalPaymentPlanQueue.map((proposal) => (
                <Link key={proposal.id} href={proposal.href as Route} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-200">
                  <p className="font-semibold text-slate-900">{proposal.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{proposal.event.name} / {proposal.status} / {formatMoney(proposal.amountCents)} / {proposal.openMilestones.length} open milestone{proposal.openMilestones.length === 1 ? "" : "s"}</p>
                </Link>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No proposal payment plans currently need planner attention.</p>
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
            <p className="text-sm text-slate-600">Agency workload, pipeline, contract risk, vendor movement, package performance, and booking conversion calculated from real OneHub records.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Revenue pipeline</p><p className="mt-2 text-2xl font-semibold">{formatMoney(dashboard.reportMetrics.pipelineCents)}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Booked revenue</p><p className="mt-2 text-2xl font-semibold">{formatMoney(dashboard.reportMetrics.bookedRevenueCents)}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Outstanding payments</p><p className="mt-2 text-2xl font-semibold">{formatMoney(dashboard.reportMetrics.outstandingPaymentCents)}</p></Card>
              <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">Inquiry-to-booking conversion</p><p className="mt-2 text-2xl font-semibold">{dashboard.reportMetrics.inquiryConversionRate}%</p><p className="mt-1 text-xs text-slate-500">{dashboard.reportMetrics.acceptedInquiryCount} of {dashboard.reportMetrics.totalInquiries} inquiries booked</p></Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900">Event workload by month</h3>
                <div className="mt-3 space-y-2">
                  {dashboard.reportMetrics.workloadByMonth.length > 0 ? dashboard.reportMetrics.workloadByMonth.map((item) => <div key={item.month} className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><span>{item.month}</span><span className="font-semibold">{item.count} event{item.count === 1 ? "" : "s"}</span></div>) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">No dated events loaded for workload reporting.</p>}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900">Vendor response performance</h3>
                <p className="mt-2 text-sm text-slate-600">{dashboard.reportMetrics.vendorTouches} relationship touch{dashboard.reportMetrics.vendorTouches === 1 ? "" : "es"} tracked with preferred/watchlist/follow-up context.</p>
                <p className="mt-2 text-sm text-slate-600">Open task load: {dashboard.reportMetrics.taskLoad}. Open contracts: {dashboard.reportMetrics.openContracts}. Money at risk: {formatMoney(dashboard.reportMetrics.moneyAtRiskCents)}.</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-slate-900">Package performance</h3>
                <div className="mt-3 space-y-2">
                  {dashboard.reportMetrics.packagePerformance.length > 0 ? dashboard.reportMetrics.packagePerformance.map((item) => <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.offers} package offer{item.offers === 1 ? "" : "s"} / {item.requests} request{item.requests === 1 ? "" : "s"} / quoted {formatMoney(item.quotedCents)}</p></div>) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">Publish packages and receive inquiries before package performance appears.</p>}
                </div>
              </Card>
            </div>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Reports are scoped to this planner organization and computed from real OneHub records: events, proposals, contracts, booking requests, listings, relationship notes, and tasks.</p>
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
