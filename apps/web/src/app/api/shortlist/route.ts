import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageEvent } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const shortlistQuerySchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
});

const shortlistMutationSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  listingId: z.string().min(1).optional(),
  vendorId: z.string().min(1).optional(), // legacy caller field; treated as listingId
  vendorName: z.string().nullable().optional(), // ignored, accepted for legacy callers
  notes: z.string().optional().nullable(),
  checked: z.boolean(),
}).refine((data) => Boolean(data.listingId || data.vendorId), {
  message: "listingId is required",
  path: ["listingId"],
});

async function getAuthorizedEvent(eventId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      org: {
        select: {
          ownerId: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return { error: NextResponse.json({ error: "Event not found" }, { status: 404 }) };
  }

  if (!canManageEvent(user, event)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, event };
}

export async function GET(request: NextRequest) {
  try {
    const parsed = shortlistQuerySchema.safeParse({
      eventId: request.nextUrl.searchParams.get("eventId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const auth = await getAuthorizedEvent(parsed.data.eventId);
    if ("error" in auth) return auth.error;

    const items = await prisma.shortlistItem.findMany({
      where: { eventId: parsed.data.eventId },
      select: {
        id: true,
        listingId: true,
        notes: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            category: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      items,
      vendors: items.map((item: { listingId: string; listing?: { title?: string | null } | null }) => ({
        id: item.listingId,
        name: item.listing?.title ?? null,
      })),
    });
  } catch (error) {
    console.error("[api/shortlist] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shortlistMutationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { eventId, checked, notes } = parsed.data;
    const listingId = parsed.data.listingId ?? parsed.data.vendorId!;

    const auth = await getAuthorizedEvent(eventId);
    if ("error" in auth) return auth.error;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (checked) {
      const item = await prisma.shortlistItem.upsert({
        where: {
          eventId_listingId: {
            eventId,
            listingId,
          },
        },
        create: {
          eventId,
          listingId,
          notes: notes ?? null,
        },
        update: {
          notes: notes ?? null,
        },
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
      });

      return NextResponse.json({ ok: true, checked: true, item });
    }

    await prisma.shortlistItem.deleteMany({
      where: {
        eventId,
        listingId,
      },
    });

    return NextResponse.json({ ok: true, checked: false, listingId });
  } catch (error) {
    console.error("[api/shortlist] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
