"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { assertPlatformAdminForGuardedMvp, canAccessDashboard } from "@/lib/rbac";
import { reviewRefundRequest } from "@/lib/refund-request";
import { reviewDisputeCase } from "@/lib/dispute-case";
import { applyHoldbackDecision } from "@/lib/holdback";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !canAccessDashboard(user, "ADMIN") || user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  assertPlatformAdminForGuardedMvp(user);
  return user;
}

export async function submitRefundReview(formData: FormData) {
  const user = await requireAdmin();
  const refundRequestId = String(formData.get("refundRequestId") || "");
  const decision = String(formData.get("decision") || "") as "APPROVED" | "DENIED";
  const decisionReason = String(formData.get("decisionReason") || "");
  const processingFeeTreatment = String(formData.get("processingFeeTreatment") || "") || undefined;
  const platformFeeTreatment = String(formData.get("platformFeeTreatment") || "") || undefined;

  await reviewRefundRequest({
    refundRequestId,
    adminId: user.id,
    decision,
    decisionReason,
    processingFeeTreatment: processingFeeTreatment as any,
    platformFeeTreatment: platformFeeTreatment as any,
  });

  revalidatePath("/app/admin/verification");
  revalidatePath(`/app/admin/verification/refunds/${refundRequestId}`);
}

export async function submitDisputeReview(formData: FormData) {
  const user = await requireAdmin();
  const disputeId = String(formData.get("disputeId") || "");
  const action = String(formData.get("action") || "") as any;
  const decisionReason = String(formData.get("decisionReason") || "");

  await reviewDisputeCase({
    disputeId,
    adminId: user.id,
    action,
    decisionReason,
  });

  revalidatePath("/app/admin/verification");
  revalidatePath(`/app/admin/verification/disputes/${disputeId}`);
}

export async function submitHoldbackDecision(formData: FormData) {
  const user = await requireAdmin();
  const paymentIntentId = String(formData.get("paymentIntentId") || "");
  const action = String(formData.get("action") || "") as "APPLY" | "RELEASE" | "CLEAR";
  const reason = String(formData.get("reason") || "");
  const holdbackAmountRaw = String(formData.get("holdbackAmountCents") || "").trim();
  const holdbackPercentRaw = String(formData.get("holdbackPercent") || "").trim();

  await applyHoldbackDecision({
    paymentIntentId,
    actorId: user.id,
    actorRole: user.role,
    action,
    reason,
    holdbackAmountCents: holdbackAmountRaw ? Number(holdbackAmountRaw) : undefined,
    holdbackPercent: holdbackPercentRaw ? Number(holdbackPercentRaw) : undefined,
  });

  revalidatePath("/app/admin/verification");
  revalidatePath(`/app/admin/verification/holdbacks/${paymentIntentId}`);
}
