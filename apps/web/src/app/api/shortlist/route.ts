import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const {
      eventId,
      vendorId,
      vendorName,
      checked,
    }: {
      eventId?: string;
      vendorId?: string;
      vendorName?: string;
      checked?: boolean;
    } = await req.json();

    if (!eventId || !vendorId || typeof checked !== "boolean") {
      return NextResponse.json(
        { error: "Missing eventId, vendorId or checked flag" },
        { status: 400 },
      );
    }

    if (checked) {
      const shortlist = (prisma as any).shortlistItem as {
        upsert(args: unknown): Promise<unknown>;
      };

      await shortlist.upsert({
        where: {
          eventId_vendorId: {
            eventId,
            vendorId,
          },
        },
        create: {
          eventId,
          vendorId,
          vendorName,
        },
        update: {
          vendorName,
        },
      });
    } else {
      const shortlist = (prisma as any).shortlistItem as {
        deleteMany(args: unknown): Promise<unknown>;
      };

      await shortlist.deleteMany({
        where: {
          eventId,
          vendorId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("shortlist POST error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const shortlist = (prisma as any).shortlistItem as {
      findMany(args: unknown): Promise<Array<{ vendorId: string; vendorName: string | null }>>;
    };

    const items = await shortlist.findMany({
      where: { eventId },
      select: {
        vendorId: true,
        vendorName: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      vendors: items.map((item) => ({
        id: item.vendorId,
        name: item.vendorName ?? null,
      })),
    });
  } catch (error) {
    console.error("shortlist GET error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


