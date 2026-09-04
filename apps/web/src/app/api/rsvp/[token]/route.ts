import { NextResponse } from "next/server";
import { z } from "zod";
import { GuestRsvpError, submitGuestRsvp } from "@/lib/guest-rsvp";
import { checkRateLimit } from "@/server/lib/rateLimit";

function rateLimitIdentifier(request: Request, token: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip");
  return `rsvp:${ip || "unknown"}:${token}`;
}

function rateLimitExceeded(resetAt: number) {
  return NextResponse.json(
    { error: "Too many RSVP attempts", retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
    { status: 429 }
  );
}

const rsvpSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  dietary: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const limit = checkRateLimit(rateLimitIdentifier(request, token), { windowMs: 60_000, maxRequests: 12 });
    if (!limit.allowed) return rateLimitExceeded(limit.resetAt);

    const body = rsvpSchema.parse(await request.json());
    const result = await submitGuestRsvp({ token, ...body });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid RSVP response", details: error.issues }, { status: 400 });
    }

    if (error instanceof GuestRsvpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to record RSVP" }, { status: 500 });
  }
}
