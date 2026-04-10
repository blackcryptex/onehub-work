import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { applyHoldbackDecision, canManageHoldbacks, getPaymentHoldbackByPaymentIntent } from "@/lib/holdback";

const holdbackDecisionSchema = z.object({
  paymentIntentId: z.string(),
  action: z.enum(["APPLY", "RELEASE", "CLEAR"]),
  reason: z.string().min(5),
  holdbackAmountCents: z.number().int().nonnegative().optional(),
  holdbackPercent: z.number().min(0).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!canManageHoldbacks(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
    }

    const paymentIntentId = request.nextUrl.searchParams.get("paymentIntentId");
    if (!paymentIntentId) {
      return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
    }

    const holdback = await getPaymentHoldbackByPaymentIntent(paymentIntentId);
    if (!holdback) {
      return NextResponse.json({ error: "Holdback not found" }, { status: 404 });
    }

    return NextResponse.json({ holdback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load holdback";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!canManageHoldbacks(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
    }

    const body = holdbackDecisionSchema.parse(await request.json());
    const holdback = await applyHoldbackDecision({
      paymentIntentId: body.paymentIntentId,
      actorId: user.id,
      actorRole: user.role,
      reason: body.reason,
      action: body.action,
      holdbackAmountCents: body.holdbackAmountCents,
      holdbackPercent: body.holdbackPercent,
    });

    return NextResponse.json({ success: true, holdback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update holdback";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
