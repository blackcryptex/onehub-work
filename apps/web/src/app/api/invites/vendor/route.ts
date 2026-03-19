import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { z } from "zod";
import { isDemoMode } from "@/lib/demo-mode";

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

    const isDemo = isDemoMode();

    if (isDemo) {
      // Demo mode: return success with preview
      return NextResponse.json({
        ok: true,
        mode: "demo",
        preview: {
          to: validated.to,
          subject: validated.subject,
          body: validated.body,
        },
        message: "Invite queued (demo mode - no actual email sent)",
      });
    }

    // Production mode: TODO - integrate with email provider (SendGrid, Resend, etc.)
    // For now, return success but note that email sending is not implemented
    return NextResponse.json({
      ok: true,
      mode: "production",
      message: "Invite queued (email sending not yet implemented)",
      // TODO: Integrate with email provider
      // Example: await sendEmail({ to: validated.to, subject: validated.subject, body: validated.body });
    });
  } catch (error) {
    console.error("[API] Error sending vendor invite:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to send invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

