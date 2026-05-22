import { Card, Button } from "@/components/ui";
import type { ElementType } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import {
  canManageEvent,
  canDeleteEvent,
  canAccessDashboard,
} from "@/lib/rbac";
import { Topbar } from "@/components/layout/Topbar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Home,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  Bell,
  Users,
  WalletCards,
} from "lucide-react";
import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
import { EventActions } from "@/components/events/EventActions";
import { ShareEventButton } from "@/components/events/ShareEventButton";
import { StakeholdersSectionClient } from "@/components/vault/StakeholdersSectionClient";
import { AiSourceVendorsVenuesPanel } from "@/components/vault/AiSourceVendorsVenuesPanel";
import { AddToShortlistButtonClient } from "@/components/shortlist/AddToShortlistButtonClient";
import { getVaultBasePath, proposalDetail, contractDetail } from "@/lib/routes";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

/**
 * Pro Planner Event Vault Detail Page
 *
 * Route: /pro/planner/vault/[eventSlug]
 *
 * Role-guarded vault detail page for PRO_PLANNER users.
 * This is a standalone implementation (not a wrapper) to avoid redirect loops.
 */
export default async function ProVaultDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams.eventSlug;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin?redirect=/pro/planner/vault");
  }

  if (!canAccessDashboard(user, "PRO_PLANNER")) {
    // For demo friendliness, redirect to demo launcher if not authorized
    redirect("/demo");
  }

  const userId = user.id;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(
    eventSlug,
    "manage",
  );
  const vaultBasePath = getVaultBasePath(user.role);

  let event;
  try {
    event = await prisma.event.findUnique({
      where: { id: authorizedEvent.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        org: {
          include: {
            owner: { select: { name: true, email: true } },
            members: {
              where: { userId: userId },
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        stakeholders: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        shares: {
          select: { viewerUserId: true, scope: true },
          where: { scope: "SUMMARY" },
        },
        budgetLines: {
          select: { plannedCents: true, actualCents: true, category: true },
        },
        milestones: { orderBy: { dueAt: "asc" } },
        checklists: {
          include: { items: { select: { id: true, done: true, title: true } } },
          orderBy: { title: "asc" },
        },
        guestLists: {
          include: {
            guests: {
              include: {
                invitations: { select: { respondedAt: true, sentAt: true } },
              },
            },
          },
        },
        bookingRequests: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                type: true,
                category: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        shortlistItems: {
          include: {
            listing: {
              include: {
                org: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        proposals: {
          include: {
            milestones: {
              select: { id: true, status: true, amountCents: true },
            },
            listing: { select: { title: true, type: true } },
            contract: { select: { id: true, title: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        contracts: {
          include: { paymentIntents: { select: { id: true, status: true, fundedAt: true } }, proposal: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
        },
        activities: { orderBy: { at: "desc" }, take: 20 },
      },
    });
  } catch (error) {
    console.error("[Pro Vault] Error loading event:", error);
    if (error instanceof Error && error.message.includes("shortlistItems")) {
      event = await prisma.event.findUnique({
        where: { id: authorizedEvent.id },
        include: {
          createdBy: { select: { name: true, email: true } },
          org: {
            include: {
              owner: { select: { name: true, email: true } },
              members: {
                where: { userId: userId },
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
          stakeholders: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          shares: {
            select: { viewerUserId: true, scope: true },
            where: { scope: "SUMMARY" },
          },
          budgetLines: {
            select: { plannedCents: true, actualCents: true, category: true },
          },
          milestones: { orderBy: { dueAt: "asc" } },
          checklists: {
            include: {
              items: { select: { id: true, done: true, title: true } },
            },
            orderBy: { title: "asc" },
          },
          guestLists: {
            include: {
              guests: {
                include: {
                  invitations: { select: { respondedAt: true, sentAt: true } },
                },
              },
            },
          },
          bookingRequests: {
            include: {
              listing: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  category: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          proposals: {
            include: {
              milestones: {
                select: { id: true, status: true, amountCents: true },
              },
              listing: { select: { title: true, type: true } },
              contract: { select: { id: true, title: true, status: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          contracts: {
          include: { paymentIntents: { select: { id: true, status: true, fundedAt: true } }, proposal: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
        },
        activities: { orderBy: { at: "desc" }, take: 20 },
        },
      });
    } else {
      throw error;
    }
  }

  if (!event) {
    return notFound();
  }

  const canManage = canManageEvent(user, event);
  const canDelete = canDeleteEvent(user, event);

  const planned = event.budgetLines.reduce((a, l) => a + l.plannedCents, 0);
  const actual = event.budgetLines.reduce((a, l) => a + l.actualCents, 0);
  const budgetPercent = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const checklistTotal = event.checklists.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );
  const checklistDone = event.checklists.reduce(
    (sum, c) => sum + c.items.filter((i) => i.done).length,
    0,
  );
  const progress =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const guestList = event.guestLists;
  const totalGuests = guestList?.guests.length || 0;
  const rsvped =
    guestList?.guests.filter((g) => g.status === "ACCEPTED").length || 0;
  const rsvpPending =
    guestList?.guests.filter((g) => g.status === "PENDING").length || 0;

  const upcomingMilestones = event.milestones
    .filter((m) => !m.done && m.dueAt && new Date(m.dueAt) > new Date())
    .slice(0, 5);
  const upcomingChecklist = event.checklists
    .flatMap((c) => c.items.filter((i) => !i.done))
    .slice(0, 5);

  const paymentPlanPending = event.proposals.flatMap((p) =>
    p.milestones.filter((m) => m.status === "PENDING"),
  ).length;
  const shortlistItems =
    "shortlistItems" in event && Array.isArray(event.shortlistItems)
      ? (event.shortlistItems as any[])
      : [];
  const contracts =
    "contracts" in event && Array.isArray(event.contracts)
      ? event.contracts
      : [];
  const paymentIntents = contracts.flatMap(
    (contract) => contract.paymentIntents || [],
  );
  const shortlistCount = shortlistItems.length;
  const bookingRequestCount = event.bookingRequests.length;
  const draftProposalCount = event.proposals.filter((proposal) => proposal.status === "DRAFT").length;
  const realProposalCount = event.proposals.filter((proposal) => proposal.status !== "DRAFT").length;
  const acceptedProposalCount = event.proposals.filter(
    (proposal) =>
      proposal.status === "ACCEPTED" || proposal.status === "CONVERTED",
  ).length;
  const signedOrActiveContracts = contracts.filter((contract) =>
    ["FULLY_SIGNED", "ACCEPTED", "IN_PAYMENT", "ACTIVE", "COMPLETED"].includes(
      contract.status,
    ),
  ).length;
  const fundedPayments = paymentIntents.filter(
    (payment) => payment.status === "SUCCEEDED" || payment.fundedAt,
  ).length;
  const openPaymentIntents = paymentIntents.filter(
    (payment) =>
      payment.status === "REQUIRES_PAYMENT" || payment.status === "PROCESSING",
  ).length;
  const nextCommerceAction = shortlistCount === 0
    ? "Source and shortlist vendors or venues for this selected event."
    : bookingRequestCount === 0 && draftProposalCount === 0 && realProposalCount === 0
      ? "Turn a shortlisted vendor into a request."
      : realProposalCount === 0
        ? "Track requests; draft proposals are not vendor-ready."
        : contracts.length === 0
          ? "Review real proposals and advance only accepted work to contract."
          : signedOrActiveContracts === 0
            ? "Complete contract review/signature before payment."
            : openPaymentIntents > 0
              ? "Resolve the open payment step attached to the signed contract."
              : "Track execution against signed contracts and paid milestones.";

  const commerceSpine = [
    {
      label: "Discovery",
      state: shortlistCount > 0 || bookingRequestCount > 0 || event.proposals.length > 0 ? "Happened" : "Pending",
      detail: shortlistCount > 0 || bookingRequestCount > 0 || event.proposals.length > 0
        ? "Event-specific sourcing has produced attached vendor activity."
        : "No persisted discovery activity yet; sourcing is available but not counted as completion.",
      blocked: false,
      next: shortlistCount > 0 ? "Keep the event shortlist current." : "Source vendors with this event attached.",
    },
    {
      label: "Shortlist",
      state: shortlistCount > 0 ? "Happened" : "Pending",
      detail: `${shortlistCount} vendor${shortlistCount === 1 ? "" : "s"} or venue${shortlistCount === 1 ? "" : "s"} attached to this event.`,
      blocked: shortlistCount === 0,
      next: shortlistCount > 0 ? "Choose who should receive a request." : "Add at least one vendor or venue to the event shortlist.",
    },
    {
      label: "Request",
      state: bookingRequestCount > 0 || draftProposalCount > 0 ? "Happened" : "Pending",
      detail: `${bookingRequestCount} booking request${bookingRequestCount === 1 ? "" : "s"}; ${draftProposalCount} draft proposal request${draftProposalCount === 1 ? "" : "s"}.`,
      blocked: shortlistCount === 0,
      next: bookingRequestCount > 0 ? "Track vendor response status." : "Create a request from a shortlisted vendor.",
    },
    {
      label: "Proposal",
      state: realProposalCount > 0 ? "Happened" : "Pending",
      detail: `${realProposalCount} non-draft proposal${realProposalCount === 1 ? "" : "s"}; drafts are not counted as vendor-ready.`,
      blocked: bookingRequestCount === 0 && draftProposalCount === 0,
      next: realProposalCount > 0 ? "Review proposal status and accepted scope." : "Wait for or prepare a real proposal from request state.",
    },
    {
      label: "Contract",
      state: contracts.length > 0 ? "Happened" : "Pending",
      detail: `${contracts.length} contract${contracts.length === 1 ? "" : "s"}; ${signedOrActiveContracts} signed/active.`,
      blocked: acceptedProposalCount === 0 && contracts.length === 0,
      next: contracts.length > 0 ? "Complete signature/review." : "Advance only accepted proposals to contract.",
    },
    {
      label: "Payment",
      state: fundedPayments > 0 ? "Happened" : openPaymentIntents > 0 || paymentPlanPending > 0 ? "Pending" : "Blocked",
      detail: `${fundedPayments} funded payment${fundedPayments === 1 ? "" : "s"}; ${openPaymentIntents} open payment intent${openPaymentIntents === 1 ? "" : "s"}; ${paymentPlanPending} pending payment-plan milestone${paymentPlanPending === 1 ? "" : "s"}.`,
      blocked: signedOrActiveContracts === 0,
      next: signedOrActiveContracts > 0 ? "Resolve open payment intent or milestone." : "Payment waits for a signed/active contract.",
    },
    {
      label: "Execution",
      state: event.status === "ACTIVE" || event.status === "COMPLETED" ? "Happened" : "Pending",
      detail: `Event status is ${event.status}.`,
      blocked: signedOrActiveContracts === 0,
      next: event.status === "COMPLETED" ? "Review closeout." : "Execute only after vendor work is contracted and payment state is clear.",
    },
  ];

  const eventWorkspaceTabs = [
    { label: "Overview", href: "#event-workspace" },
    { label: "Sourcing", href: "#workspace-sourcing" },
    { label: "Shortlist", href: "#workspace-shortlist-detail" },
    { label: "Requests", href: "#workspace-requests-detail" },
    { label: "Proposals", href: "#workspace-proposals-detail" },
    { label: "Contracts", href: "#workspace-contracts-detail" },
    { label: "Payments", href: "#workspace-payment-detail" },
    { label: "Tasks", href: "#workspace-operations" },
    { label: "Guests", href: "#workspace-guests" },
    { label: "Budget", href: "#workspace-budget" },
    { label: "Timeline", href: "#workspace-timeline-detail" },
    { label: "Contacts", href: "#context-contacts" },
  ];
  const eventLocation =
    event.venueCity && event.venueState
      ? `${event.venueCity}, ${event.venueState}`
      : event.venueCity || undefined;
  const sourceVendorsHref = `/marketplace?eventId=${event.id}&eventSlug=${event.slug}&eventName=${encodeURIComponent(event.name)}${eventLocation ? `&location=${encodeURIComponent(eventLocation)}` : ""}&returnTo=${encodeURIComponent(`/pro/planner/vault/${event.slug}`)}`;
  const existingVendorRequests = event.bookingRequests.map((request) => ({
    title: request.listing.title,
    category: request.listing.category,
    type: request.listing.type,
    status: request.status,
  }));
  const bookingRequestsByListingId = new Map(
    event.bookingRequests.map((request) => [request.listingId, request]),
  );
  const proposalsByListingId = new Map(
    event.proposals
      .filter((proposal) => proposal.listingId)
      .map((proposal) => [proposal.listingId, proposal]),
  );
  const getShortlistStatus = (listingId: string) => {
    const proposal = proposalsByListingId.get(listingId);
    const bookingRequest = bookingRequestsByListingId.get(listingId);

    if (proposal?.contract) {
      return {
        status: `Contract: ${proposal.contract.status}`,
        nextAction: "Review attached contract",
      };
    }

    if (proposal) {
      return {
        status: `Proposal: ${proposal.status}`,
        nextAction: "Review proposal details",
      };
    }

    if (bookingRequest) {
      return {
        status: `Booking request: ${bookingRequest.status}`,
        nextAction: "Track vendor response",
      };
    }

    return {
      status: "Shortlisted",
      nextAction: "Request booking or prepare a proposal request",
    };
  };

  const mainContacts = [
    event.org.owner,
    ...event.org.members.slice(0, 2).map((m) => m.user),
  ].filter(Boolean);

  const statusColors: Record<string, string> = {
    PLANNING: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELED: "bg-rose-100 text-rose-700",
  };

  const globalNavItems = [
    { label: "Home", href: "/pro/planner", icon: Home },
    { label: "Events", href: "/pro/planner/vault", icon: BriefcaseBusiness },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Marketplace", href: "/marketplace", icon: Store },
    { label: "Help", href: "/help", icon: HelpCircle },
  ];

  const chipClassForState = (state: string) =>
    state === "Happened"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : state === "Blocked"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  const commerceIcons: Record<string, ElementType> = {
    Discovery: Search,
    Shortlist: Store,
    Request: FileCheck,
    Proposal: FileText,
    Contract: ShieldCheck,
    Payment: CreditCard,
    Execution: ListChecks,
  };

  const riskItems = commerceSpine
    .filter((step) => step.blocked)
    .map((step) => `${step.label}: ${step.next}`);
  const confirmedVendorItems = event.proposals
    .filter(
      (proposal) =>
        proposal.listing &&
        (proposal.status === "ACCEPTED" ||
          proposal.status === "CONVERTED" ||
          proposal.contract),
    )
    .map((proposal) => ({
      id: proposal.id,
      title: proposal.listing?.title ?? proposal.title,
      status: proposal.contract?.status
        ? `Contract: ${proposal.contract.status}`
        : `Proposal: ${proposal.status}`,
    }));
  const confirmedVendorCount = new Set(
    confirmedVendorItems.map((item) => item.title),
  ).size;

  const operationCards = [
    {
      id: "workspace-sourcing-card",
      title: "Sourcing",
      icon: Search,
      summary:
        shortlistCount > 0 || bookingRequestCount > 0
          ? `Find vendors and venues; ${shortlistCount} shortlisted and ${bookingRequestCount} request${bookingRequestCount === 1 ? "" : "s"} attached.`
          : "Find vendors and venues; no persisted sourcing activity counted yet.",
      status: commerceSpine[0]?.state ?? "Pending",
      action: "Source vendors",
      href: sourceVendorsHref,
    },
    {
      id: "workspace-shortlist",
      title: "Shortlist",
      icon: Store,
      summary: `${shortlistCount} vendor${shortlistCount === 1 ? "" : "s"} or venue${shortlistCount === 1 ? "" : "s"} attached to this event.`,
      status: commerceSpine[1]?.state ?? "Pending",
      action: "Review shortlist",
      href: "#workspace-shortlist-detail",
    },
    {
      id: "workspace-confirmed-vendors",
      title: "Confirmed vendors",
      icon: ShieldCheck,
      summary:
        confirmedVendorCount > 0
          ? `${confirmedVendorCount} vendor${confirmedVendorCount === 1 ? "" : "s"} backed by accepted proposal or contract state.`
          : "No vendors are confirmed until accepted proposal or contract state supports it.",
      status: confirmedVendorCount > 0 ? "Happened" : "Pending",
      action: "Review confirmed",
      href: "#workspace-confirmed-vendors-detail",
    },
    {
      id: "workspace-proposals",
      title: "Proposals",
      icon: FileText,
      summary: `${realProposalCount} non-draft; ${draftProposalCount} draft request${draftProposalCount === 1 ? "" : "s"}.`,
      status: commerceSpine[3]?.state ?? "Pending",
      action: "Open proposals",
      href: "#workspace-proposals-detail",
    },
    {
      id: "workspace-contracts",
      title: "Contracts",
      icon: ShieldCheck,
      summary: `${contracts.length} attached; ${signedOrActiveContracts} signed or active.`,
      status: commerceSpine[4]?.state ?? "Pending",
      action: "Review contracts",
      href: "#workspace-contracts-detail",
    },
    {
      id: "workspace-payment",
      title: "Payment readiness",
      icon: WalletCards,
      summary:
        signedOrActiveContracts > 0
          ? `${fundedPayments} funded; ${openPaymentIntents} open payment intent${openPaymentIntents === 1 ? "" : "s"}.`
          : "Payment waits for signed or active contract state.",
      status: commerceSpine[5]?.state ?? "Pending",
      action: "Check payment",
      href: "#workspace-payment-detail",
    },
    {
      id: "workspace-operations",
      title: "Execution checklist",
      icon: ListChecks,
      summary: `${checklistDone}/${checklistTotal} checklist items complete; ${event.milestones.length} milestone${event.milestones.length === 1 ? "" : "s"}.`,
      status: commerceSpine[6]?.state ?? "Pending",
      action: "Open tasks",
      href: `/events/${eventSlug}/checklists`,
    },
    {
      id: "workspace-guests",
      title: "Guests",
      icon: Users,
      summary: `${rsvped} accepted of ${totalGuests} invited; ${rsvpPending} pending.`,
      status: rsvpPending > 0 ? "Pending" : totalGuests > 0 ? "Happened" : "Pending",
      action: "Manage guests",
      href: `/events/${eventSlug}/guests`,
    },
    {
      id: "workspace-budget",
      title: "Budget overview",
      icon: BarChart3,
      summary: `$${(actual / 100).toFixed(0)} actual of $${(planned / 100).toFixed(0)} planned; ${budgetPercent}% used.`,
      status: budgetPercent > 90 ? "Blocked" : budgetPercent > 0 ? "Happened" : "Pending",
      action: "View budget",
      href: `/events/${eventSlug}/budget`,
    },
    {
      id: "workspace-timeline",
      title: "Event timeline",
      icon: CalendarDays,
      summary: `${upcomingMilestones.length} upcoming milestone${upcomingMilestones.length === 1 ? "" : "s"} loaded from event state.`,
      status: upcomingMilestones.length > 0 ? "Pending" : "Pending",
      action: "View timeline",
      href: "#workspace-timeline-detail",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <ImpersonationBanner />
      <Topbar role={user.role} />
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[6.25rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[6.75rem_minmax(0,1fr)_24rem]">
        <aside className="hidden border-r border-slate-200 bg-white/95 px-2 py-5 xl:block">
          <nav aria-label="Global navigation" className="space-y-1">
            {globalNavItems.map((item) => {
              const NavIcon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href as any}
                  title={item.label}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <NavIcon className="h-4 w-4 shrink-0" />
                  <span className="max-w-full truncate leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main
          id="content"
          className="min-w-0 px-4 py-5 sm:px-6 lg:px-8"
          data-route-source="apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx"
          data-commerce-spine="Discovery|Shortlist|Request|Proposal|Contract|Payment|Execution"
        >
          <div className="w-full max-w-none space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Link href={vaultBasePath as any} className="hover:text-indigo-700">
                      Events
                    </Link>
                    <span>/</span>
                    <span className="font-medium text-slate-700">{event.name}</span>
                  </div>
                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
                    <h1 className="break-words text-3xl font-semibold tracking-normal text-slate-950 lg:text-4xl">
                      {event.name}
                    </h1>
                    <Star className="h-5 w-5 text-amber-400" aria-label="Favorite event" />
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[event.status] || statusColors.PLANNING}`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      {new Date(event.startAt).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      {eventLocation || "Location pending"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {canManage &&
                    (user.role === "PRO_PLANNER" ||
                      user.role === "DIY_PLANNER" ||
                      isAdmin(user)) && (
                      <ShareEventButton
                        eventSlug={eventSlug}
                        stakeholders={(event as any).stakeholders || []}
                        shares={(event as any).shares || []}
                      />
                    )}
                  <Button asChild size="sm">
                    <Link href="#event-workspace">
                      <ExternalLink className="h-4 w-4" />
                      Open event workspace
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={vaultBasePath as any}>
                      <ArrowLeft className="h-4 w-4" />
                      Back to Vault
                    </Link>
                  </Button>
                  <Button size="sm" variant="secondary" aria-label="More event actions">
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </Button>
                  <EventActions
                    role={user.role}
                    eventSlug={eventSlug}
                    eventId={event.id}
                    eventName={event.name}
                    canEdit={false}
                    canDelete={canDelete}
                    size="sm"
                  />
                  {!canDelete && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete unavailable
                    </span>
                  )}
                </div>
              </div>
            </header>

            <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Selected-event navigation
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Next real action: <span className="font-semibold text-slate-900">{nextCommerceAction}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {eventWorkspaceTabs.map((tab) => (
                    <Link
                      key={tab.label}
                      href={tab.href}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {tab.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
                {commerceSpine.map((step, index) => {
                  const StepIcon = commerceIcons[step.label] || CheckCircle2;
                  return (
                    <article
                      key={step.label}
                      className="min-h-[10rem] rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <StepIcon className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-[11px] font-semibold uppercase text-slate-400">
                              {String(index + 1).padStart(2, "0")}
                            </div>
                            <h2 className="text-sm font-semibold text-slate-950">{step.label}</h2>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${chipClassForState(step.state)}`}>
                          {step.state}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-600">{step.detail}</p>
                      <p className={`mt-3 text-xs font-semibold ${step.blocked ? "text-rose-700" : "text-slate-500"}`}>
                        {step.next}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-5">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</p>
                    <p className="mt-1 text-3xl font-semibold">{progress}%</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {checklistDone}/{checklistTotal} checklist items complete.
                </p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</p>
                <p className="mt-2 text-2xl font-semibold">${(actual / 100).toFixed(0)}</p>
                <p className="text-sm text-slate-600">of ${(planned / 100).toFixed(0)} planned</p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guests</p>
                <p className="mt-2 text-2xl font-semibold">{rsvped}/{totalGuests}</p>
                <p className="text-sm text-slate-600">{rsvpPending} RSVP pending</p>
              </Card>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-2 text-2xl font-semibold">{event.status}</p>
                <p className="text-sm text-slate-600">
                  {riskItems.length > 0 ? `${riskItems.length} blocked item${riskItems.length === 1 ? "" : "s"}` : "No blocked spine items"}
                </p>
              </Card>
            </section>

            <section id="event-workspace" className="scroll-mt-24 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    Operational workspace
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">Command Center Overview</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-600">
                    Sourcing, shortlist, confirmed vendors, budget planning, and payments are separated so each area reflects real event state.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={sourceVendorsHref}>Source vendors</Link>
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {operationCards.map((card) => {
                  const CardIcon = card.icon;
                  return (
                    <Card key={card.title} id={card.id} className="scroll-mt-24 p-5 transition hover:border-indigo-200 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <CardIcon className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="font-semibold text-slate-950">{card.title}</h3>
                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${chipClassForState(card.status)}`}>
                              {card.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 min-h-[3rem] text-sm leading-6 text-slate-600">{card.summary}</p>
                      <Button asChild size="sm" variant="secondary" className="mt-4">
                        <Link href={card.href as any}>{card.action}</Link>
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section id="workspace-sourcing" className="scroll-mt-24 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Sourcing</p>
                  <h2 className="mt-1 text-xl font-semibold">Find vendors and venues</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Sourcing is marketplace discovery. It does not mean a vendor is shortlisted, requested, contracted, or paid.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                    <p className="mt-1 text-sm font-semibold">{new Date(event.startAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                    <p className="mt-1 text-sm font-semibold">{event.type.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                    <p className="mt-1 text-sm font-semibold">{eventLocation || "Pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Guest target</p>
                    <p className="mt-1 text-sm font-semibold">{event.guestTarget || "Pending"}</p>
                  </div>
                </div>
                {event.objective && <p className="mt-4 text-sm text-slate-700">{event.objective}</p>}
              </div>

              <AiSourceVendorsVenuesPanel
                eventId={event.id}
                eventName={event.name}
                eventType={event.type}
                eventLocation={eventLocation}
                eventDate={event.startAt.toISOString()}
                guestCount={event.guestTarget}
                existingBookingRequests={existingVendorRequests}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card id="workspace-shortlist-detail" className="scroll-mt-24 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Shortlist</h3>
                  <span className="text-sm font-medium text-slate-500">{shortlistItems.length} shortlisted</span>
                </div>
                <div className="mt-4 space-y-3">
                  {shortlistItems.length > 0 ? (
                    shortlistItems.map((item: any) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold">{item.listing.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.listing.type === "VENUE" ? "Venue" : "Vendor"} / {item.listing.category}
                              {item.listing.org.city ? ` / ${item.listing.org.city}, ${item.listing.org.state}` : ""}
                            </p>
                            <p className="mt-2 text-xs text-slate-600">
                              {getShortlistStatus(item.listingId).status}. {getShortlistStatus(item.listingId).nextAction}.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/marketplace/${item.listing.slug}?eventId=${event.id}&eventSlug=${event.slug}&eventName=${encodeURIComponent(event.name)}&returnTo=${encodeURIComponent(`/pro/planner/vault/${event.slug}`)}` as any}>
                                Request booking
                              </Link>
                            </Button>
                            <GenerateProposalButton
                              eventId={event.id}
                              listingId={item.listingId}
                              label="Prepare draft request"
                              loadingLabel="Preparing draft..."
                            />
                            <AddToShortlistButtonClient
                              eventId={event.id}
                              listingId={item.listingId}
                              allowRemove
                              initialAdded
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No vendors or venues have been shortlisted for this event yet.
                    </p>
                  )}
                </div>
              </Card>

              <Card id="workspace-confirmed-vendors-detail" className="scroll-mt-24 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Confirmed vendors</h3>
                  <span className="text-sm font-medium text-slate-500">{confirmedVendorCount} confirmed</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Confirmed vendors require accepted proposal or contract-backed state. Shortlisted vendors are not counted here.
                </p>
                <div className="mt-4 space-y-3">
                  {confirmedVendorItems.length > 0 ? (
                    confirmedVendorItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.status}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No confirmed vendors yet. Accepted proposals or contracts will appear here.
                    </p>
                  )}
                </div>
              </Card>

              <Card id="workspace-requests-detail" className="scroll-mt-24 p-5">
                <h3 className="text-lg font-semibold">Requests</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Requests are outreach or proposal-request state. Draft proposal requests are not vendor-sent or vendor-ready.
                </p>
                <div className="mt-4 space-y-3">
                  {event.bookingRequests.length > 0 ? (
                    event.bookingRequests.map((request) => (
                      <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold">{request.listing.title}</p>
                        <p className="mt-1 text-xs text-slate-500">Booking request status: {request.status}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No booking requests are attached yet.
                    </p>
                  )}
                  {event.proposals.filter((proposal) => proposal.status === "DRAFT").map((proposal) => (
                    <div key={proposal.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="font-semibold">{proposal.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Draft request / ${(proposal.totalCents / 100).toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Draft only; not counted as a vendor-ready proposal.
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card id="workspace-proposals-detail" className="scroll-mt-24 p-5">
                <h3 className="text-lg font-semibold">Proposals</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Proposals only count as proposal state when they are no longer draft requests.
                </p>
                <div className="mt-4 space-y-3">
                  {event.proposals.filter((proposal) => proposal.status !== "DRAFT").length > 0 ? (
                    event.proposals
                      .filter((proposal) => proposal.status !== "DRAFT")
                      .map((proposal) => (
                        <div key={proposal.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{proposal.title}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            Status: {proposal.status} / ${(proposal.totalCents / 100).toFixed(2)}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={proposalDetail(proposal.id) as any}>View</Link>
                        </Button>
                      </div>
                        </div>
                      ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No non-draft proposals are attached yet.
                    </p>
                  )}
                </div>
              </Card>

              <Card id="workspace-contracts-detail" className="scroll-mt-24 p-5">
                <h3 className="text-lg font-semibold">Contracts</h3>
                <div className="mt-4 space-y-3">
                  {event.proposals.filter((proposal) => proposal.contract).length > 0 ? (
                    event.proposals
                      .filter((proposal) => proposal.contract)
                      .map((proposal) => (
                        <div key={proposal.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{proposal.contract?.title ?? proposal.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Status: {proposal.contract?.status ?? "ATTACHED"} / Proposal: {proposal.title}
                              </p>
                            </div>
                            {proposal.contract && (
                              <Button asChild size="sm">
                                <Link href={contractDetail(proposal.contract.id) as any}>View</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No contract exists yet. Contracts appear only after accepted proposal work advances.
                    </p>
                  )}
                </div>
              </Card>

              <Card id="workspace-payment-detail" className="scroll-mt-24 p-5">
                <h3 className="text-lg font-semibold">Payments / Held funds</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Payments and held funds are transaction state: payment intents, deposits, funded amounts, and release readiness. This is separate from budget planning.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Funded</p>
                    <p className="mt-1 text-xl font-semibold">{fundedPayments}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Open intents</p>
                    <p className="mt-1 text-xl font-semibold">{openPaymentIntents}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Pending milestones</p>
                    <p className="mt-1 text-xl font-semibold">{paymentPlanPending}</p>
                  </div>
                </div>
                {signedOrActiveContracts === 0 && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                    Payment remains blocked until signed or active contract state supports it.
                  </p>
                )}
              </Card>

              <Card id="workspace-timeline-detail" className="scroll-mt-24 p-5">
                <h3 className="text-lg font-semibold">Timeline</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Timeline shows upcoming event milestones from event state. It does not route to payments or held funds.
                </p>
                <div className="mt-4 space-y-3">
                  {upcomingMilestones.length > 0 ? (
                    upcomingMilestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="font-semibold">{milestone.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {milestone.dueAt ? new Date(milestone.dueAt).toLocaleDateString() : "Date pending"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      No upcoming timeline milestones are loaded.
                    </p>
                  )}
                </div>
              </Card>
            </section>

            {canManage &&
              (user.role === "PRO_PLANNER" ||
                user.role === "DIY_PLANNER" ||
                isAdmin(user)) && (
                <Card className="p-5">
                  <h3 className="text-lg font-semibold">Manage clients</h3>
                  <div className="mt-4">
                    <StakeholdersSectionClient
                      eventSlug={eventSlug}
                      stakeholders={((event as any).stakeholders || []).map((s: any) => ({
                        id: s.id,
                        userId: s.userId,
                        role: s.role,
                        user: {
                          id: s.user.id,
                          name: s.user.name,
                          email: s.user.email,
                        },
                      }))}
                    />
                  </div>
                </Card>
              )}
          </div>
        </main>

        <aside className="border-t border-slate-200 bg-white px-4 py-5 xl:border-l xl:border-t-0 xl:px-5">
          <div className="sticky top-5 space-y-4">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ListChecks className="h-5 w-5 text-indigo-700" />
                Next actions
              </h2>
              <div className="mt-4 space-y-3">
                <p className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950">
                  {nextCommerceAction}
                </p>
                {upcomingChecklist.length > 0 ? (
                  upcomingChecklist.slice(0, 3).map((item) => (
                    <p key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      {item.title}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No open checklist items loaded.</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Bell className="h-5 w-5 text-indigo-700" />
                Recent activity
              </h2>
              <div className="mt-4 space-y-3">
                {event.activities.length > 0 ? (
                  event.activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm text-slate-700">{activity.action}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(activity.at).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No recent activity loaded.</p>
                )}
              </div>
            </Card>

            <Card id="context-contacts" className="scroll-mt-24 p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-5 w-5 text-indigo-700" />
                Key contacts
              </h2>
              <div className="mt-4 space-y-3">
                {mainContacts.length > 0 ? (
                  mainContacts.map((contact, i) => (
                    <div key={`${contact?.email ?? "contact"}-${i}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold">{contact?.name || "Unnamed contact"}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{contact?.email || "Email pending"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No key contacts loaded.</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Risks and blocks
              </h2>
              <div className="mt-4 space-y-3">
                {riskItems.length > 0 ? (
                  riskItems.map((risk) => (
                    <p key={risk} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {risk}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No blocked commerce-spine items from current state.</p>
                )}
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
