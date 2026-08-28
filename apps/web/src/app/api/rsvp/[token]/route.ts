import { NextResponse } from "next/server";
import { z } from "zod";
import { GuestRsvpError, submitGuestRsvp } from "@/lib/guest-rsvp";

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
