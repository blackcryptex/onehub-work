import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  Contract,
  EventItem,
  Guest,
  Milestone,
  Proposal,
  Status,
  Task,
  VendorLink,
} from "@/lib/types";
import type {
  ContractStatus,
  ListingCategory,
  Prisma,
  ProposalStatus,
  RSVPStatus,
} from "@prisma/client";

type PrismaEventWithRelations = Awaited<
  ReturnType<typeof prisma.event.findMany<{
    include: {
      tasks: {
        select: {
          id: true;
          title: true;
          dueAt: true;
          status: true;
          assigneeId: true;
        };
      };
      milestones: {
        select: {
          id: true;
          title: true;
          dueAt: true;
          done: true;
        };
      };
      proposals: {
        select: {
          id: true;
          title: true;
          status: true;
          totalCents: true;
          updatedAt: true;
          createdAt: true;
        };
      };
      contracts: {
        select: {
          id: true;
          title: true;
          status: true;
          updatedAt: true;
        };
      };
      guestLists: {
        select: {
          guests: {
            select: {
              id: true;
              firstName: true;
              lastName: true;
              email: true;
              status: true;
            };
          };
        };
      };
      shortlistItems: {
        select: {
          id: true;
          listingId: true;
          notes: true;
          listing: {
            select: {
              id: true;
              title: true;
              category: true;
              type: true;
            };
          };
        };
      };
      budgetLines: {
        select: {
          plannedCents: true;
          actualCents: true;
        };
      };
    };
  }>>
>[number];

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

function mapTask(task: PrismaEventWithRelations["tasks"][number], fallback: Date): Task {
  return {
    id: task.id,
    title: task.title,
    due: (task.dueAt ?? fallback).toISOString(),
    done: task.status === "DONE",
    assignee: task.assigneeId ?? undefined,
  };
}

function mapMilestone(
  milestone: PrismaEventWithRelations["milestones"][number],
): Milestone {
  return {
    id: milestone.id,
    title: milestone.title,
    due: milestone.dueAt.toISOString(),
    status: milestone.done ? "completed" : "pending",
  };
}

function mapGuest(guest: { firstName?: string | null; lastName?: string | null; email?: string | null; status: RSVPStatus }): Guest {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim();
  return {
    name: name || guest.email || "Guest",
    email: guest.email ?? undefined,
    rsvp: mapRsvpStatus(guest.status),
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

/**
 * Maps Prisma ListingCategory enum to VendorLink category string union.
 * Type-safe mapping that converts database enum values to the expected API format.
 */
function mapListingCategoryToVendorCategory(
  category: ListingCategory | null | undefined
): VendorLink["category"] {
  if (!category) return "other";
  
  switch (category) {
    case "VENUE_SPACE":
      return "venue";
    case "CATERING":
      return "catering";
    case "DECOR_FLORAL":
      return "florist";
    case "ENTERTAINMENT":
      return "music";
    case "PHOTO_VIDEO":
      return "photo";
    case "OTHER":
    case "TRANSPORT":
    case "STAFFING":
    case "PLANNING_SERVICES":
    case "RENTALS":
    default:
      return "other";
  }
}

function mapVendor(shortlistItem: PrismaEventWithRelations["shortlistItems"][number]): VendorLink {
  return {
    id: shortlistItem.listingId,
    name: shortlistItem.listing?.title ?? "Vendor",
    category: mapListingCategoryToVendorCategory(shortlistItem.listing?.category),
    secured: false,
    shortlisted: true,
  };
}

function mapProposal(proposal: PrismaEventWithRelations["proposals"][number]): Proposal {
  return {
    id: proposal.id,
    vendorName: proposal.title ?? "Proposal",
    amount: proposal.totalCents ? Math.round(proposal.totalCents / 100) : undefined,
    status: mapProposalStatus(proposal.status),
    sentAt: (proposal.updatedAt ?? proposal.createdAt).toISOString(),
  };
}

function mapContract(contract: PrismaEventWithRelations["contracts"][number]): Contract {
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

function mapEvent(event: PrismaEventWithRelations): EventItem {
  const tasks = event.tasks.map((task) => mapTask(task, event.startAt));
  const milestones = event.milestones.map(mapMilestone);
  const proposals = event.proposals.map(mapProposal);
  const contracts = event.contracts.map(mapContract);
  const guests = event.guestLists.flatMap((list) =>
    list.guests.map((guest: { firstName?: string | null; lastName?: string | null; email?: string | null; status: RSVPStatus }) => mapGuest(guest)),
  );
  const vendors = event.shortlistItems.map(mapVendor);

  const budgetPlanned = event.budgetLines.reduce(
    (acc: number, line: PrismaEventWithRelations["budgetLines"][number]) => acc + (line.plannedCents ?? 0),
    0,
  );
  const budgetActual = event.budgetLines.reduce(
    (acc: number, line: PrismaEventWithRelations["budgetLines"][number]) => acc + (line.actualCents ?? 0),
    0,
  );

  return {
    id: event.id,
    slug: event.slug, // Add slug for delete operations
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

export async function GET() {
  try {
    const session = await auth();
    
    // Debug logging
    console.log("[DIY Events API] Request received", {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email,
    });
    
    // In development, allow unauthenticated access (return empty events)
    // In production, require authentication
    if (!session?.user?.id) {
      if (process.env.NODE_ENV === "development") {
        console.log("[DIY Events API] Development mode: returning empty events (no auth)");
        return NextResponse.json({ events: [] });
      }
      console.warn("[DIY Events API] Unauthorized: no session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Phase 0: Security hardening - Block CLIENT users from accessing planner event APIs
    if (session.user.role === "CLIENT") {
      console.warn("[DIY Events API] CLIENT user attempted to access DIY events API");
      return NextResponse.json({ error: "Forbidden: CLIENT users cannot access planner event APIs" }, { status: 403 });
    }

    const userId = session.user.id as string;
    console.log("[DIY Events API] Loading events for user:", userId);

    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { orgId: true },
    });
    const orgIds = Array.from(new Set(memberships.map((m) => m.orgId)));

    console.log("[DIY Events API] User memberships:", {
      userId,
      orgIds,
      membershipCount: memberships.length,
    });

    const where: Prisma.EventWhereInput = {
      OR: [
        { createdById: userId },
        ...(orgIds.length ? [{ orgId: { in: orgIds } }] : []),
      ],
    };

    console.log("[DIY Events API] Query where clause:", JSON.stringify(where, null, 2));

    const events = await prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
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
        shortlistItems: {
          select: {
            id: true,
            listingId: true,
            notes: true,
            listing: {
              select: {
                id: true,
                title: true,
                category: true,
                type: true,
              },
            },
          },
        },
      },
    });

    console.log("[DIY Events API] Found events:", {
      count: events.length,
      eventIds: events.map((e) => e.id),
    });

    const legacyEvents = events.map((event) => mapEvent(event));

    console.log("[DIY Events API] Mapped events:", {
      count: legacyEvents.length,
      eventNames: legacyEvents.map((e) => e.name),
    });

    return NextResponse.json({ events: legacyEvents });
  } catch (error) {
    console.error("[DIY Events API] Error loading DIY events:", error);
    if (error instanceof Error) {
      console.error("[DIY Events API] Error stack:", error.stack);
      console.error("[DIY Events API] Error message:", error.message);
    }
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}

