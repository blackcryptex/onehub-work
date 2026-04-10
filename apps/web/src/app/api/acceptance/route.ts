import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listAcceptanceProof } from "@/lib/acceptance";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const proposalId = searchParams.get("proposalId") || undefined;
  const contractId = searchParams.get("contractId") || undefined;
  const paymentIntentId = searchParams.get("paymentIntentId") || undefined;
  const adminOverrideId = searchParams.get("adminOverrideId") || undefined;

  const proof = await listAcceptanceProof({ proposalId, contractId, paymentIntentId, adminOverrideId });
  return NextResponse.json({ proof });
}
