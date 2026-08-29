import type { Prisma } from "@prisma/client";
import type { AppUser } from "@/lib/auth-helpers";
import { canViewEvent, isOrgMember } from "@/lib/rbac";
import { db as defaultDb } from "@/server/db";

export type LogisticsAudience = "planner" | "provider" | "venue" | "client" | "admin";
export type LogisticsSeverity = "clear" | "watch" | "late" | "blocked" | "critical";
export type LogisticsSourceType =
  | "event"
  | "milestone"
  | "task"
  | "checklist_item"
  | "calendar_event"
  | "booking_request"
  | "availability_slot"
  | "crisis_issue";

export type EventLogisticsItem = {
  eventId: string;
  sourceType: LogisticsSourceType;
  sourceId: string;
  title: string;
  startsAt?: Date | null;
  dueAt?: Date | null;
  endsAt?: Date | null;
  status: string;
  ownerRole: LogisticsAudience;
  severity: LogisticsSeverity;
  isLate: boolean;
  isConflict: boolean;
  changeReason?: string | null;
  nextAction: string;
  audience: LogisticsAudience[];
  href?: string;
};

export type EventLogisticsSummary = {
  eventId: string;
  eventName: string;
  generatedAt: Date;
  items: EventLogisticsItem[];
  lateItems: EventLogisticsItem[];
  conflictItems: EventLogisticsItem[];
  criticalItems: EventLogisticsItem[];
  nextAction: EventLogisticsItem | null;
  roleNextActions: Record<LogisticsAudience, EventLogisticsItem | null>;
};

type LogisticsDb = Pick<Prisma.TransactionClient, "event" | "availabilitySlot">;

const ACTIVE_BOOKING_STATUSES = new Set(["PENDING", "HOLD", "QUOTED"]);
const BLOCKED_TASK_STATUSES = new Set(["BLOCKED"]);
const DONE_TASK_STATUSES = new Set(["DONE"]);
const ACTIVE_CRISIS_STATUSES = new Set(["OPEN", "IMPACT_REVIEW", "REPLACEMENT_STARTED"]);
const CRITICAL_CRISIS_SEVERITIES = new Set(["HIGH", "CRITICAL"]);

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function sortedItems(items: EventLogisticsItem[]) {
  const rank: Record<LogisticsSeverity, number> = { critical: 0, blocked: 1, late: 2, watch: 3, clear: 4 };
  return [...items].sort((a, b) => {
    const severityDelta = rank[a.severity] - rank[b.severity];
    if (severityDelta !== 0) return severityDelta;
    const aTime = (a.dueAt ?? a.startsAt ?? a.endsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = (b.dueAt ?? b.startsAt ?? b.endsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function severityForDate(date: Date | null | undefined, done: boolean, now: Date): LogisticsSeverity {
  if (done) return "clear";
  if (!date) return "watch";
  if (date < now) return "late";
  if (date <= addDays(now, 7)) return "watch";
  return "clear";
}

function providerAudience(listingType: string | null | undefined): LogisticsAudience {
  return listingType === "VENUE" ? "venue" : "provider";
}

function visibleToActor(actor: AppUser | null | undefined, audience: LogisticsAudience[]) {
  if (!actor) return audience.includes("client");
  if (actor.role === "ADMIN") return true;
  if (actor.role === "CLIENT") return audience.includes("client");
  if (actor.role === "VENUE") return audience.includes("venue");
  if (actor.role === "VENDOR") return audience.includes("provider");
  return audience.includes("planner");
}

function roleNext(items: EventLogisticsItem[], role: LogisticsAudience) {
  return sortedItems(items.filter((item) => item.audience.includes(role)))[0] ?? null;
}

export async function getEventLogisticsSummary(params: {
  eventId: string;
  actor?: AppUser | null;
  db?: LogisticsDb;
  now?: Date;
}): Promise<EventLogisticsSummary> {
  const db = params.db ?? defaultDb;
  const now = params.now ?? new Date();
  const event = await db.event.findUnique({
    where: { id: params.eventId },
    include: {
      org: { include: { members: true } },
      stakeholders: { select: { userId: true, role: true } },
      shares: { select: { viewerUserId: true, scope: true } },
      milestones: { orderBy: { dueAt: "asc" } },
      tasks: { orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }] },
      checklists: { include: { items: { orderBy: { dueAt: "asc" } } } },
      calendarEvents: { orderBy: { startAt: "asc" } },
      bookingRequests: {
        include: { listing: { include: { org: { include: { members: true } } } } },
        orderBy: { startAt: "asc" },
      },
      crisisIssues: { orderBy: [{ severity: "desc" }, { createdAt: "desc" }] },
    },
  });

  if (!event) throw new Error("Event not found");
  if (params.actor && !canViewEvent(params.actor, event) && !isOrgMember(params.actor, event.org)) {
    throw new Error("Forbidden");
  }

  const bookingRequests = event.bookingRequests.filter((request) => ACTIVE_BOOKING_STATUSES.has(request.status));
  const listingIds = unique(bookingRequests.map((request) => request.listingId));
  const availabilitySlots = listingIds.length > 0
    ? await db.availabilitySlot.findMany({
        where: {
          listingId: { in: listingIds },
          status: { in: ["HOLD", "BOOKED", "UNAVAILABLE"] },
          startAt: { lte: event.endAt },
          endAt: { gte: event.startAt },
        },
        include: { listing: true },
        orderBy: { startAt: "asc" },
      })
    : [];

  const items: EventLogisticsItem[] = [];
  items.push({
    eventId: event.id,
    sourceType: "event",
    sourceId: event.id,
    title: `${event.name} event window`,
    startsAt: event.startAt,
    endsAt: event.endAt,
    dueAt: event.startAt,
    status: event.status,
    ownerRole: "planner",
    severity: severityForDate(event.startAt, event.status === "COMPLETED", now),
    isLate: event.startAt < now && event.status !== "COMPLETED",
    isConflict: false,
    nextAction: event.startAt < now ? "Confirm event execution status and close remaining logistics items." : "Keep provider, task, and calendar readiness aligned before event day.",
    audience: ["planner", "client", "admin"],
    href: `/events/${event.slug}`,
  });

  for (const milestone of event.milestones) {
    const severity = severityForDate(milestone.dueAt, milestone.done, now);
    items.push({
      eventId: event.id,
      sourceType: "milestone",
      sourceId: milestone.id,
      title: milestone.title,
      dueAt: milestone.dueAt,
      status: milestone.done ? "DONE" : "OPEN",
      ownerRole: "planner",
      severity,
      isLate: severity === "late",
      isConflict: false,
      nextAction: milestone.done ? "Milestone complete." : "Complete or reschedule this event timeline milestone.",
      audience: ["planner", "client", "admin"],
      href: `/pro/planner/vault/${event.slug}#workspace-timeline-detail`,
    });
  }

  for (const task of event.tasks) {
    const done = DONE_TASK_STATUSES.has(task.status);
    const severity = BLOCKED_TASK_STATUSES.has(task.status) ? "blocked" : severityForDate(task.dueAt, done, now);
    items.push({
      eventId: event.id,
      sourceType: "task",
      sourceId: task.id,
      title: task.title,
      dueAt: task.dueAt,
      status: task.status,
      ownerRole: "planner",
      severity,
      isLate: severity === "late",
      isConflict: false,
      changeReason: task.blockerReason,
      nextAction: BLOCKED_TASK_STATUSES.has(task.status) ? `Resolve blocker: ${task.blockerReason ?? "blocked task"}.` : done ? "Task complete." : "Move this assigned task forward or update its due date/status.",
      audience: ["planner", "admin"],
      href: `/events/${event.slug}/tasks`,
    });
  }

  for (const checklistItem of event.checklists.flatMap((checklist) => checklist.items.map((item) => ({ ...item, checklistTitle: checklist.title })))) {
    const severity = severityForDate(checklistItem.dueAt, checklistItem.done, now);
    items.push({
      eventId: event.id,
      sourceType: "checklist_item",
      sourceId: checklistItem.id,
      title: `${checklistItem.checklistTitle}: ${checklistItem.title}`,
      dueAt: checklistItem.dueAt,
      status: checklistItem.done ? "DONE" : "OPEN",
      ownerRole: "planner",
      severity,
      isLate: severity === "late",
      isConflict: false,
      nextAction: checklistItem.done ? "Checklist item complete." : "Finish or assign this checklist item before it blocks execution.",
      audience: ["planner", "admin"],
      href: `/events/${event.slug}/checklists`,
    });
  }

  for (const calendarEvent of event.calendarEvents) {
    const severity = severityForDate(calendarEvent.startAt, false, now);
    items.push({
      eventId: event.id,
      sourceType: "calendar_event",
      sourceId: calendarEvent.id,
      title: calendarEvent.title,
      startsAt: calendarEvent.startAt,
      endsAt: calendarEvent.endAt,
      dueAt: calendarEvent.startAt,
      status: calendarEvent.visibility ?? "calendar",
      ownerRole: "planner",
      severity,
      isLate: severity === "late",
      isConflict: false,
      nextAction: "Confirm attendees, location, and any provider impact for this calendar item.",
      audience: ["planner", "client", "admin"],
      href: "/calendar",
    });
  }

  const conflictingBookingIds = new Set<string>();
  for (let i = 0; i < bookingRequests.length; i += 1) {
    for (let j = i + 1; j < bookingRequests.length; j += 1) {
      const left = bookingRequests[i];
      const right = bookingRequests[j];
      if (!left || !right) continue;
      if (left.listingId === right.listingId && overlaps(left.startAt, left.endAt, right.startAt, right.endAt)) {
        conflictingBookingIds.add(left.id);
        conflictingBookingIds.add(right.id);
      }
    }
  }

  for (const request of bookingRequests) {
    const ownerRole = providerAudience(request.listing?.type);
    const isConflict = conflictingBookingIds.has(request.id);
    const statusSeverity: LogisticsSeverity = isConflict
      ? "blocked"
      : request.status === "PENDING"
        ? severityForDate(request.startAt, false, now) === "late" ? "late" : "watch"
        : request.status === "HOLD" || request.status === "QUOTED"
          ? "watch"
          : "clear";
    items.push({
      eventId: event.id,
      sourceType: "booking_request",
      sourceId: request.id,
      title: `${request.listing?.title ?? "Provider"} booking request`,
      startsAt: request.startAt,
      endsAt: request.endAt,
      dueAt: request.startAt,
      status: request.status,
      ownerRole,
      severity: statusSeverity,
      isLate: statusSeverity === "late",
      isConflict,
      changeReason: request.notes,
      nextAction: isConflict
        ? "Resolve overlapping provider request before relying on this schedule."
        : request.status === "PENDING"
          ? "Provider should hold, decline, or quote this request. Planner should follow up before the event window."
          : request.status === "HOLD"
            ? "Planner should confirm scope or request a quote before the hold expires."
            : request.status === "QUOTED"
              ? "Planner should review the provider-backed proposal and update the event plan."
              : "Review booking request status before advancing event logistics.",
      audience: ["planner", ownerRole, "admin"],
      href: `/pro/planner/vault/${event.slug}#workspace-requests-detail`,
    });
  }

  for (const slot of availabilitySlots) {
    const matchedRequest = bookingRequests.find((request) => request.listingId === slot.listingId && overlaps(request.startAt, request.endAt, slot.startAt, slot.endAt));
    const ownerRole = providerAudience(slot.listing?.type);
    const isConflict = slot.status === "UNAVAILABLE" && Boolean(matchedRequest);
    items.push({
      eventId: event.id,
      sourceType: "availability_slot",
      sourceId: slot.id,
      title: `${slot.listing?.title ?? "Provider"} availability ${slot.status.toLowerCase()}`,
      startsAt: slot.startAt,
      endsAt: slot.endAt,
      dueAt: slot.startAt,
      status: slot.status,
      ownerRole,
      severity: isConflict ? "critical" : slot.status === "HOLD" ? "watch" : "clear",
      isLate: false,
      isConflict,
      changeReason: slot.note,
      nextAction: isConflict
        ? "Find replacement or reschedule; provider availability conflicts with this event request."
        : slot.status === "HOLD"
          ? "Convert the hold into a confirmed booking or release it so the planner can decide."
          : "Availability is reflected in the event logistics plan.",
      audience: ["planner", ownerRole, "admin"],
      href: `/pro/planner/vault/${event.slug}#workspace-requests-detail`,
    });
  }

  for (const issue of event.crisisIssues.filter((issue) => ACTIVE_CRISIS_STATUSES.has(issue.status))) {
    items.push({
      eventId: event.id,
      sourceType: "crisis_issue",
      sourceId: issue.id,
      title: issue.title,
      dueAt: issue.replacementSearchStartedAt ?? issue.createdAt,
      status: issue.status,
      ownerRole: "planner",
      severity: CRITICAL_CRISIS_SEVERITIES.has(issue.severity) ? "critical" : "blocked",
      isLate: false,
      isConflict: true,
      changeReason: issue.impactSummary,
      nextAction: issue.recommendedNextAction,
      audience: ["planner", "client", "provider", "venue", "admin"],
      href: `/pro/planner/vault/${event.slug}#workspace-crisis-detail`,
    });
  }

  const visibleItems = sortedItems(items.filter((item) => visibleToActor(params.actor, item.audience)));
  const summary: EventLogisticsSummary = {
    eventId: event.id,
    eventName: event.name,
    generatedAt: now,
    items: visibleItems,
    lateItems: visibleItems.filter((item) => item.isLate),
    conflictItems: visibleItems.filter((item) => item.isConflict),
    criticalItems: visibleItems.filter((item) => item.severity === "critical" || item.severity === "blocked"),
    nextAction: visibleItems[0] ?? null,
    roleNextActions: {
      planner: roleNext(visibleItems, "planner"),
      provider: roleNext(visibleItems, "provider"),
      venue: roleNext(visibleItems, "venue"),
      client: roleNext(visibleItems, "client"),
      admin: roleNext(visibleItems, "admin"),
    },
  };

  return summary;
}
