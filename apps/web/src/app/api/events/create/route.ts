import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseBudget } from "@/lib/parsers/budget";
import { canonicalizeEventType } from "@/lib/parsers/eventType";
import { buildPlannerPayload as _buildPlannerPayload } from "@/lib/ai/buildPlannerPayload";
import { z } from "zod";
import type { BudgetCategory, EventType, ProposalStatus, ContractStatus, RSVPStatus, Role } from "@prisma/client";
import type { EventItem, Task, Milestone, Proposal, Contract, Guest, VendorLink, Status } from "@/lib/types";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { recordAudit } from "@/server/lib/audit";

// Request validation schema
const createEventSchema = z.object({
  name: z.string().trim().min(1, "Event name is required"),
  event_type_raw: z.string().trim().min(1, "Event type is required"),
  budget_raw: z.string().trim().min(1, "Budget is required"),
  date: z.string().trim().min(1, "Event date is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().length(2, "State must be 2 characters (e.g., NY, CA)").transform((value) => value.toUpperCase()),
  zipCode: z.string().trim().regex(/^\d{5}$/, "Zip code must be 5 digits"),
  headcount: z.string().trim().refine((value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }, "Headcount must be a number greater than 0"),
  venue: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  style: z.string().trim().min(1, "Event style & theme is required"),
  clientIds: z.array(z.string()).optional().default([]),
  autoShareSummary: z.boolean().optional().default(false),
});

// Mapping functions (duplicated from /api/diy/events for consistency)
const PROPOSAL_STATUS_MAP: Record<ProposalStatus, Status> = {
  DRAFT: "draft",
  SENT: "sent",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  EXPIRED: "rejected",
  CONVERTED: "completed",
};

const CONTRACT_STATUS_MAP: Record<ContractStatus, Status> = {
  DRAFT: "draft",
  OUT_FOR_SIGNATURE: "pending",
  PARTIALLY_SIGNED: "pending",
  FULLY_SIGNED: "signed",
  ACCEPTED: "signed",
  IN_PAYMENT: "pending",
  ACTIVE: "completed",
  COMPLETED: "completed",
  CANCELED: "rejected",
};

function mapProposalStatus(status: ProposalStatus): Status {
  return PROPOSAL_STATUS_MAP[status] ?? "pending";
}

function mapContractStatus(status: ContractStatus): Status {
  return CONTRACT_STATUS_MAP[status] ?? "pending";
}

function mapTask(task: any, fallback: Date): Task {
  return {
    id: task.id,
    title: task.title,
    due: (task.dueAt ?? fallback).toISOString(),
    done: task.status === "DONE",
    assignee: task.assigneeId ?? undefined,
  };
}

function mapMilestone(milestone: any): Milestone {
  return {
    id: milestone.id,
    title: milestone.title,
    due: milestone.dueAt.toISOString(),
    status: milestone.done ? "completed" : "pending",
  };
}

function mapRsvpStatus(status: RSVPStatus): Guest["rsvp"] {
  switch (status) {
    case "ACCEPTED":
      return "yes";
    case "DECLINED":
      return "no";
    default:
      return "maybe";
  }
}

function mapGuest(guest: { firstName?: string | null; lastName?: string | null; email?: string | null; status: RSVPStatus }): Guest {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim();
  return {
    name: name || guest.email || "Guest",
    email: guest.email ?? undefined,
    rsvp: mapRsvpStatus(guest.status),
  };
}

function mapVendor(shortlistItem: { vendorId: string; vendorName?: string | null }): VendorLink {
  return {
    id: shortlistItem.vendorId,
    name: shortlistItem.vendorName ?? "Vendor",
    category: "other",
    secured: false,
    shortlisted: true,
  };
}

function mapProposal(proposal: { id: string; title?: string | null; status: ProposalStatus; totalCents?: number | null; updatedAt: Date; createdAt: Date }): Proposal {
  return {
    id: proposal.id,
    vendorName: proposal.title ?? "Proposal",
    amount: proposal.totalCents ? Math.round(proposal.totalCents / 100) : undefined,
    status: mapProposalStatus(proposal.status),
    sentAt: (proposal.updatedAt ?? proposal.createdAt).toISOString(),
  };
}

function mapContract(contract: { id: string; title?: string | null; status: ContractStatus; updatedAt: Date }): Contract {
  return {
    id: contract.id,
    counterparty: contract.title ?? "Contract",
    status: mapContractStatus(contract.status),
    lastUpdated: contract.updatedAt.toISOString(),
  };
}

const EVENT_CREATOR_ROLES: Role[] = ["DIY_PLANNER", "PRO_PLANNER", "ADMIN"];

const EVENT_TYPE_BY_CANONICAL: Record<NonNullable<ReturnType<typeof canonicalizeEventType>>, EventType> = {
  wedding: "WEDDING",
  conference: "CONFERENCE",
  corporate: "CORPORATE_GALA",
  birthday: "BIRTHDAY",
  fundraiser: "FUNDRAISER",
  festival: "FESTIVAL",
  sports: "SPORTS",
  other: "OTHER",
};

function canCreatePlannerEvent(role: Role): boolean {
  return EVENT_CREATOR_ROLES.includes(role);
}

function eventTypeFromCanonical(canonical: ReturnType<typeof canonicalizeEventType>): EventType {
  return canonical ? EVENT_TYPE_BY_CANONICAL[canonical] : "OTHER";
}

function computeProgress(tasks: Task[], milestones: Milestone[]): number {
  const total = tasks.length + milestones.length;
  if (!total) return 0;
  const completed =
    tasks.filter((task) => task.done).length +
    milestones.filter((milestone) => milestone.status === "completed").length;
  return Math.min(100, Math.round((completed / total) * 100));
}

function mapEventToEventItem(event: any): EventItem {
  const tasks = (event.tasks || []).map((task: any) => mapTask(task, event.startAt));
  const milestones = (event.milestones || []).map(mapMilestone);
  const proposals = (event.proposals || []).map(mapProposal);
  const contracts = (event.contracts || []).map(mapContract);
  const guests = (event.guestLists || []).flatMap((list: any) =>
    (list.guests || []).map((guest: any) => mapGuest(guest))
  );
  // shortlistItems not included in query, so vendors will be empty array for newly created events
  const vendors: VendorLink[] = [];

  const budgetPlanned = (event.budgetLines || []).reduce(
    (acc: number, line: any) => acc + (line.plannedCents ?? 0),
    0,
  );
  const budgetActual = (event.budgetLines || []).reduce(
    (acc: number, line: any) => acc + (line.actualCents ?? 0),
    0,
  );

  return {
    id: event.id,
    name: event.name,
    date: event.startAt.toISOString(),
    location: [event.venueCity, event.venueState].filter(Boolean).join(", ") || undefined,
    description: event.description ?? undefined,
    progress: computeProgress(tasks, milestones),
    budget:
      budgetPlanned || budgetActual
        ? {
            total: budgetPlanned ? Math.round(budgetPlanned / 100) : undefined,
            spent: budgetActual ? Math.round(budgetActual / 100) : undefined,
          }
        : undefined,
    city: event.venueCity ?? undefined,
    vendors,
    proposals,
    contracts,
    guests,
    tasks,
    milestones,
  };
}

// This is a placeholder - in production, use tRPC properly
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || undefined;
  const logger = getRequestLogger(requestId);
  
  let session: { user?: { id?: string } } | null = null;
  let orgIdForLogging: string | undefined;
  let validatedEventInput: z.infer<typeof createEventSchema> | undefined;
  
  try {
    session = await auth();
    if (!session?.user?.id) {
      logger.warn({ route: "/api/events/create" }, "Unauthorized event creation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Phase 0: Security hardening - Block CLIENT users from creating events
    const user = await getCurrentUser();
    if (!user) {
      logger.warn({ route: "/api/events/create" }, "Unauthorized event creation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!canCreatePlannerEvent(user.role)) {
      logger.warn({ userId: user.id, role: user.role, route: "/api/events/create" }, "Forbidden event creation role");
      return NextResponse.json({ error: "Forbidden: this role cannot create events" }, { status: 403 });
    }
    
    logger.debug({ userId: user.id, route: "/api/events/create" }, "Event creation request started");

    const userId = user.id;
    const body = await request.json();

    // Validate request body
    const validationResult = createEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors: validationResult.error.flatten().fieldErrors,
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const eventInput = validationResult.data;
    validatedEventInput = eventInput;

    const requestedClientIds = Array.from(new Set(eventInput.clientIds ?? []));
    const validClientIds = requestedClientIds.length > 0
      ? (await prisma.user.findMany({
          where: {
            id: { in: requestedClientIds },
            role: "CLIENT",
          },
          select: { id: true },
        })).map((client) => client.id)
      : [];

    if (validClientIds.length !== requestedClientIds.length) {
      return NextResponse.json({ error: "Invalid client selection" }, { status: 400 });
    }

    // Parse date
    const startDate = new Date(eventInput.date);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 4); // Default 4-hour event

    // Parse budget from free text
    const parsedBudget = parseBudget(eventInput.budget_raw);
    const estimatedBudget = parsedBudget.max || parsedBudget.min || 0;

    // Canonicalize event type
    const eventTypeCanonical = canonicalizeEventType(eventInput.event_type_raw);

    const event = await prisma.$transaction(async (tx) => {
      let txOrg = await tx.organization.findFirst({
        where: { ownerId: userId, type: { in: ["PLANNER", "CLIENT_AGENCY"] } },
      });

      if (!txOrg) {
        const slug = `user-${userId.slice(0, 8)}`;
        txOrg = await tx.organization.create({
          data: {
            name: "My Events",
            slug,
            type: "PLANNER",
            ownerId: userId,
            members: { create: { userId, role: "OWNER" } },
            settings: { create: {} },
          },
        });
      }

      orgIdForLogging = txOrg.id;

      logger.info({
        userId,
        orgId: txOrg.id,
        route: "/api/events/create",
        event_type_raw_length: eventInput.event_type_raw.length,
        budget_raw_length: eventInput.budget_raw.length,
        budget_parse_success: !!(parsedBudget.min || parsedBudget.max),
        budget_currency_detected: parsedBudget.currency,
        event_type_canonicalized: !!eventTypeCanonical,
      }, "event.creation_started");

      const slugBase = eventInput.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
      let attempts = 0;
      let currentSlug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
      const maxAttempts = 5;
      let createdEvent;

      while (attempts < maxAttempts) {
        try {
          createdEvent = await tx.event.create({
            data: {
              orgId: txOrg.id,
              createdById: userId,
              name: eventInput.name,
              slug: currentSlug,
              type: eventTypeFromCanonical(eventTypeCanonical),
              eventTypeRaw: eventInput.event_type_raw,
              eventTypeCanonical: eventTypeCanonical || null,
              budgetRaw: eventInput.budget_raw,
              budgetMin: parsedBudget.min || null,
              budgetMax: parsedBudget.max || null,
              budgetCurrency: parsedBudget.currency || null,
              objective: eventInput.objective || null,
              description: eventInput.style || null,
              startAt: startDate,
              endAt: endDate,
              venueCity: eventInput.city || null,
              venueState: eventInput.state || null,
              venueCountry: "US",
              guestTarget: eventInput.headcount ? parseInt(eventInput.headcount, 10) : undefined,
              status: "PLANNING",
              budgetCents: estimatedBudget,
            },
          });
          break;
        } catch (createError: any) {
          if (createError?.code === "P2002" && createError?.meta?.target?.includes("slug")) {
            attempts++;
            currentSlug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
            logger.debug({ userId, orgId: txOrg.id, attempt: attempts, slug: currentSlug }, "event.slug_conflict_retry");
            continue;
          }
          throw createError;
        }
      }

      if (!createdEvent) {
        throw new Error("Failed to create event after multiple attempts");
      }

      if (validClientIds.length > 0) {
        await tx.eventStakeholder.createMany({
          data: validClientIds.map((clientId) => ({
            eventId: createdEvent.id,
            userId: clientId,
            role: "CLIENT",
            addedByUserId: userId,
          })),
          skipDuplicates: true,
        });

        if (eventInput.autoShareSummary) {
          await tx.eventShare.createMany({
            data: validClientIds.map((clientId) => ({
              eventId: createdEvent.id,
              viewerUserId: clientId,
              scope: "SUMMARY",
              createdByUserId: userId,
            })),
            skipDuplicates: true,
          });
        }

        logger.info({
          userId,
          eventId: createdEvent.id,
          clientCount: validClientIds.length,
          autoShare: eventInput.autoShareSummary,
        }, "event.clients_linked");
      }

      const parsedHeadcount = eventInput.headcount ? Number.parseInt(eventInput.headcount, 10) : Number.NaN;
      const baselineHeadcount = Number.isNaN(parsedHeadcount) ? 100 : parsedHeadcount;
      const budgetLines: Array<{ category: BudgetCategory; label: string; plannedCents: number }> = [
        { category: "VENUE", label: "Venue", plannedCents: Math.round(baselineHeadcount * 50 * 100) },
        { category: "CATERING", label: "Catering", plannedCents: Math.round(baselineHeadcount * 35 * 100) },
        { category: "ENTERTAINMENT", label: "Entertainment", plannedCents: Math.round(baselineHeadcount * 25 * 100) },
        { category: "DECOR", label: "Decor", plannedCents: Math.round(baselineHeadcount * 20 * 100) },
      ];

      await tx.budgetLine.createMany({
        data: budgetLines.map((line) => ({
          eventId: createdEvent.id,
          label: line.label,
          category: line.category,
          plannedCents: line.plannedCents,
          actualCents: 0,
          notes: "AI auto-allocated with 20% buffer",
        })),
      });

      await tx.milestone.create({
        data: {
          eventId: createdEvent.id,
          title: "Event Day",
          dueAt: startDate,
          done: false,
        },
      });

      const checklistItems = [
        "Book venue",
        "Confirm vendor quotes",
        "Send invitations",
        "Finalize guest list",
        "Confirm catering",
        "Set up decor",
      ];

      const checklist = await tx.checklist.create({
        data: {
          eventId: createdEvent.id,
          title: "Event Planning Checklist",
        },
      });

      await tx.checklistItem.createMany({
        data: checklistItems.map((item, i) => ({
          checklistId: checklist.id,
          title: item,
          done: false,
          order: i,
        })),
      });

      return createdEvent;
    });

    // Fetch the created event with all relations to return full EventItem
    // Using findFirst instead of findUnique to avoid potential timing issues
    // and matching the exact pattern from /api/diy/events/route.ts
    // Note: Using type assertion for shortlistItems due to Prisma type generation issues
    const createdEventWithRelations = await prisma.event.findFirst({
      where: { id: event.id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            status: true,
            assigneeId: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            done: true,
          },
        },
        proposals: {
          select: {
            id: true,
            title: true,
            status: true,
            totalCents: true,
            updatedAt: true,
            createdAt: true,
          },
        },
        contracts: {
          select: {
            id: true,
            title: true,
            status: true,
            updatedAt: true,
          },
        },
        guestLists: {
          select: {
            guests: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
              },
            },
          },
        },
        budgetLines: {
          select: {
            plannedCents: true,
            actualCents: true,
          },
        },
        // Note: shortlistItems removed - not available in Prisma client and not needed for newly created events
      },
    });

    if (!createdEventWithRelations) {
      return NextResponse.json({ error: "Failed to fetch created event" }, { status: 500 });
    }

    // Map to EventItem format
    const eventItem = mapEventToEventItem(createdEventWithRelations);

    // Log successful event creation
    logger.info({
      userId,
      orgId: event.orgId,
      eventId: event.id,
      eventSlug: event.slug,
      eventName: event.name,
      route: "/api/events/create",
      budgetCents: estimatedBudget,
      eventTypeCanonical: eventTypeCanonical || null,
    }, "event.created");

    return NextResponse.json({ event: eventItem, eventId: event.id, slug: event.slug });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create event";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Structured error logging
    logger.error({
      userId: session?.user?.id,
      orgId: orgIdForLogging,
      route: "/api/events/create",
      error: errorMessage,
      stack: errorStack,
      validatedEventInput: validatedEventInput ? {
        name: validatedEventInput.name,
        event_type_raw: validatedEventInput.event_type_raw,
        budget_raw: validatedEventInput.budget_raw,
      } : undefined,
    }, "event.create_failed");

    // Track error for monitoring/alerting
    trackError(error, {
      route: "/api/events/create",
      userId: session?.user?.id,
      orgId: orgIdForLogging,
    });

    // Log to audit log for admin visibility
    if (session?.user?.id && orgIdForLogging) {
      try {
        await recordAudit({
          actorId: session.user.id,
          orgId: orgIdForLogging,
          action: "event.create.failed",
          metadata: {
            error: errorMessage,
            route: "/api/events/create",
          },
        });
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        logger.warn({ error: auditError }, "Failed to record audit log for event creation failure");
      }
    }

    return NextResponse.json(
      { 
        error: "Failed to create event",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

