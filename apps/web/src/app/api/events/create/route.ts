import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseBudget } from "@/lib/parsers/budget";
import { canonicalizeEventType } from "@/lib/parsers/eventType";
import { buildPlannerPayload as _buildPlannerPayload } from "@/lib/ai/buildPlannerPayload";
import { z } from "zod";
import type { BudgetCategory, ProposalStatus, ContractStatus, RSVPStatus } from "@prisma/client";
import type { EventItem, Task, Milestone, Proposal, Contract, Guest, VendorLink, Status } from "@/lib/types";
import { getRequestLogger } from "@/lib/logger";
import { trackError } from "@/lib/errorTracker";
import { recordAudit } from "@/server/lib/audit";

// Request validation schema
const createEventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  event_type_raw: z.string().min(1, "Event type is required"),
  budget_raw: z.string().min(1, "Budget is required"),
  date: z.string().min(1, "Event date is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  headcount: z.string().optional(),
  venue: z.string().optional(),
  objective: z.string().optional(),
  style: z.string().optional(),
  // Phase 3: Client intake data
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
  let org: { id: string } | null = null;
  let validated: z.infer<typeof createEventSchema> | null = null;
  
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
    
    if (user.role === "CLIENT") {
      logger.warn({ userId: user.id, route: "/api/events/create" }, "CLIENT user attempted to create event");
      return NextResponse.json({ error: "Forbidden: CLIENT users cannot create events" }, { status: 403 });
    }
    
    logger.debug({ userId: user.id, route: "/api/events/create" }, "Event creation request started");

    const userId = user.id;
    const body = await request.json();

    // Validate request body
    const validationResult = createEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    validated = validationResult.data;

    // Get or create a default org for DIY planner
    org = await prisma.organization.findFirst({
      where: { ownerId: userId, type: "PLANNER" },
    });

    if (!org) {
      // Create default org for DIY planner
      const slug = `user-${userId.slice(0, 8)}`;
      org = await prisma.organization.create({
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

    // Generate slug
    const slugBase = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    // Parse date
    const startDate = new Date(validated.date);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 4); // Default 4-hour event

    // Parse budget from free text
    const parsedBudget = parseBudget(validated.budget_raw);
    const estimatedBudget = parsedBudget.max || parsedBudget.min || 0;

    // Canonicalize event type
    const eventTypeCanonical = canonicalizeEventType(validated.event_type_raw);

    // Log telemetry data (structured)
    logger.info({
      userId,
      orgId: org.id,
      route: "/api/events/create",
      event_type_raw_length: validated.event_type_raw.length,
      budget_raw_length: validated.budget_raw.length,
      budget_parse_success: !!(parsedBudget.min || parsedBudget.max),
      budget_currency_detected: parsedBudget.currency,
      event_type_canonicalized: !!eventTypeCanonical,
    }, "event.creation_started");

    // Create event with retry logic for slug conflicts
    let event;
    let attempts = 0;
    let currentSlug = slug;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        event = await prisma.event.create({
          data: {
            orgId: org.id,
            createdById: userId,
            name: validated.name,
            slug: currentSlug,
            type: "OTHER", // Default legacy enum value for backward compatibility
            eventTypeRaw: validated.event_type_raw,
            eventTypeCanonical: eventTypeCanonical || null,
            budgetRaw: validated.budget_raw,
            budgetMin: parsedBudget.min || null,
            budgetMax: parsedBudget.max || null,
            budgetCurrency: parsedBudget.currency || null,
            objective: validated.objective || null,
            description: validated.style || null,
            startAt: startDate,
            endAt: endDate,
            venueCity: validated.city || null,
            venueState: validated.state || null,
            venueCountry: "US",
            guestTarget: validated.headcount ? parseInt(validated.headcount, 10) : undefined,
            status: "PLANNING",
            budgetCents: estimatedBudget,
          },
        });
        break; // Success, exit loop
      } catch (createError: any) {
        // If slug conflict, try again with a new slug
        if (createError?.code === "P2002" && createError?.meta?.target?.includes("slug")) {
          attempts++;
          currentSlug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
          logger.debug({ userId, orgId: org.id, attempt: attempts, slug: currentSlug }, "event.slug_conflict_retry");
          continue;
        }
        // Re-throw other errors
        throw createError;
      }
    }
    
    if (!event) {
      throw new Error("Failed to create event after multiple attempts");
    }

    // Phase 3: Create EventStakeholder records for selected clients
    if (validated.clientIds && validated.clientIds.length > 0) {
      try {
        // Verify all client IDs are valid CLIENT users
        const clientUsers = await prisma.user.findMany({
          where: {
            id: { in: validated.clientIds },
            role: "CLIENT",
          },
          select: { id: true },
        });

        const validClientIds = clientUsers.map((u) => u.id);

        // Create EventStakeholder records
        await Promise.all(
          validClientIds.map((clientId) =>
            prisma.eventStakeholder.create({
              data: {
                eventId: event.id,
                userId: clientId,
                role: "CLIENT",
                addedByUserId: userId,
              },
            }).catch((error: any) => {
              // Ignore unique constraint violations (client already stakeholder)
              if (error?.code !== "P2002") {
                logger.warn({ userId, eventId: event.id, clientId, error: error.message }, "Failed to create EventStakeholder");
              }
            })
          )
        );

        // Optionally create EventShare SUMMARY records for smooth initial client experience
        if (validated.autoShareSummary) {
          await Promise.all(
            validClientIds.map((clientId) =>
              prisma.eventShare.create({
                data: {
                  eventId: event.id,
                  viewerUserId: clientId,
                  scope: "SUMMARY",
                  createdByUserId: userId,
                },
              }).catch((error: any) => {
                // Ignore unique constraint violations (share already exists)
                if (error?.code !== "P2002") {
                  logger.warn({ userId, eventId: event.id, clientId, error: error.message }, "Failed to create EventShare");
                }
              })
            )
          );
        }

        logger.info({
          userId,
          eventId: event.id,
          clientCount: validClientIds.length,
          autoShare: validated.autoShareSummary,
        }, "event.clients_linked");
      } catch (error) {
        // Log error but don't fail event creation
        logger.error({ userId, eventId: event.id, error: error instanceof Error ? error.message : String(error) }, "Failed to link clients to event");
      }
    }

    // AI-generated content (stubs - these would call AI service)
    // 1. AI drafts brief
    // 2. AI searches for vendors/venues (async - would trigger background job)
    // 3. AI establishes budget
    // 4. AI creates checklist and milestones

    // Create initial budget with AI allocation (placeholder)
    const parsedHeadcount = validated.headcount ? Number.parseInt(validated.headcount, 10) : Number.NaN;
    const baselineHeadcount = Number.isNaN(parsedHeadcount) ? 100 : parsedHeadcount;
    const budgetLines: Array<{ category: BudgetCategory; label: string; plannedCents: number }> = [
      { category: "VENUE", label: "Venue", plannedCents: Math.round(baselineHeadcount * 50 * 100) },
      { category: "CATERING", label: "Catering", plannedCents: Math.round(baselineHeadcount * 35 * 100) },
      { category: "ENTERTAINMENT", label: "Entertainment", plannedCents: Math.round(baselineHeadcount * 25 * 100) },
      { category: "DECOR", label: "Decor", plannedCents: Math.round(baselineHeadcount * 20 * 100) },
    ];

    for (const line of budgetLines) {
      await prisma.budgetLine.create({
        data: {
          eventId: event.id,
          label: line.label,
          category: line.category,
          plannedCents: line.plannedCents,
          actualCents: 0,
          notes: "AI auto-allocated with 20% buffer",
        },
      });
    }

    // Create initial milestone
    await prisma.milestone.create({
      data: {
        eventId: event.id,
        title: "Event Day",
        dueAt: startDate,
        done: false,
      },
    });

    // Create initial checklist with items
    const checklistItems = [
      "Book venue",
      "Confirm vendor quotes",
      "Send invitations",
      "Finalize guest list",
      "Confirm catering",
      "Set up decor",
    ];

    // Create a single checklist
    const checklist = await prisma.checklist.create({
      data: {
        eventId: event.id,
        title: "Event Planning Checklist",
      },
    });

    // Create checklist items
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i];
      if (!item) continue;
      await prisma.checklistItem.create({
        data: {
          checklistId: checklist.id,
          title: item,
          done: false,
          order: i,
        },
      });
    }

    // Trigger AI vendor search (would be async job in production)
    // This is a placeholder - in production, this would queue a background job

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
      orgId: org.id,
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
      orgId: org?.id,
      route: "/api/events/create",
      error: errorMessage,
      stack: errorStack,
      validated: validated ? {
        name: validated.name,
        event_type_raw: validated.event_type_raw,
        budget_raw: validated.budget_raw,
      } : undefined,
    }, "event.create_failed");

    // Track error for monitoring/alerting
    trackError(error, {
      route: "/api/events/create",
      userId: session?.user?.id,
      orgId: org?.id,
    });

    // Log to audit log for admin visibility
    if (session?.user?.id && org?.id) {
      try {
        await recordAudit({
          actorId: session.user.id,
          orgId: org.id,
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

