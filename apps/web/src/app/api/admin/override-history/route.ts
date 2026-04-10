import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listAdminOverrides } from "@/lib/admin-override";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType") || undefined;
  const targetId = searchParams.get("targetId") || undefined;
  const proposalId = searchParams.get("proposalId") || undefined;
  const paymentIntentId = searchParams.get("paymentIntentId") || undefined;
  const refundRequestId = searchParams.get("refundRequestId") || undefined;
  const disputeId = searchParams.get("disputeId") || undefined;
  const paymentHoldbackId = searchParams.get("paymentHoldbackId") || undefined;
  const payoutId = searchParams.get("payoutId") || undefined;

  const items = await listAdminOverrides({
    targetType: targetType as any,
    targetId,
    proposalId,
    paymentIntentId,
    refundRequestId,
    disputeId,
    paymentHoldbackId,
    payoutId,
  });

  return NextResponse.json({ items });
}
