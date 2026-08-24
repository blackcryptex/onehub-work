import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { sendOutboundEmail } from "@/lib/outbound";
import { z } from "zod";

const inviteVendorSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  vendorName: z.string(),
  eventName: z.string().optional(),
  eventId: z.string().optional(),
});

/**
 * POST /api/invites/vendor
 * Send an invite to a vendor to join OneHub
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = inviteVendorSchema.parse(body);

    const delivery = await sendOutboundEmail({
      to: validated.to,
      subject: validated.subject,
      text: validated.body,
    });

    const deliveryMessage =
      delivery.status === "SENT"
        ? "Invite email sent through configured outbound provider."
        : delivery.status === "NOT_CONFIGURED"
          ? "Outbound email delivery is not configured; no email was sent by OneHub."
          : "Outbound email provider failed; no delivery confirmation was recorded.";

    return NextResponse.json({
      ok: true,
      message: deliveryMessage,
      delivery,
      preview: {
        to: validated.to,
        subject: validated.subject,
        body: validated.body,
      },
    });
  } catch (error) {
    console.error("[API] Error sending vendor invite:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to send invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

