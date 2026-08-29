import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  providerBookingStatusValues,
  setProviderBookingRequestStatus,
  submitProviderQuoteForBookingRequest,
  type ProviderBookingStatus,
} from "@/server/lib/booking-request-workflow";

function isProviderBookingStatus(value: unknown): value is ProviderBookingStatus {
  return typeof value === "string" && providerBookingStatusValues.includes(value as ProviderBookingStatus);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();

    if (!isProviderBookingStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const bookingRequest = await setProviderBookingRequestStatus({
      db: prisma,
      id,
      status: body.status,
      user,
    });

    return NextResponse.json({ success: true, bookingRequest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lead status";
    const status = message.includes("Authentication") || message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();
    const quoteCents = Number.parseInt(String(body.quoteCents), 10);

    if (!Number.isFinite(quoteCents) || quoteCents < 0) {
      return NextResponse.json({ error: "quoteCents must be a whole number greater than or equal to 0" }, { status: 400 });
    }

    const result = await submitProviderQuoteForBookingRequest({
      db: prisma,
      id,
      quoteCents,
      note: body.note || null,
      user,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to quote lead";
    const status = message.includes("Authentication") || message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
