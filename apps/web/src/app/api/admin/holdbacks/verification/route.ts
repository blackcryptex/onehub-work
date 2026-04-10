import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { canManageHoldbacks, getHoldbackVerificationContext } from "@/lib/holdback";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!canManageHoldbacks(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
    }

    const paymentIntentId = request.nextUrl.searchParams.get("paymentIntentId") || undefined;
    const milestoneId = request.nextUrl.searchParams.get("milestoneId") || undefined;
    const proposalId = request.nextUrl.searchParams.get("proposalId") || undefined;

    const context = await getHoldbackVerificationContext({ paymentIntentId, milestoneId, proposalId });
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load verification context";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
