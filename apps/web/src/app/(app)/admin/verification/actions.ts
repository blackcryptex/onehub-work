"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { assertPlatformAdminForGuardedMvp, canAccessDashboard } from "@/lib/rbac";
import { reviewRefundRequest, type RefundFeeTreatment } from "@/lib/refund-request";
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

const REFUND_REVIEW_DECISIONS = ["APPROVED", "DENIED"] as const;
type RefundReviewDecision = (typeof REFUND_REVIEW_DECISIONS)[number];

const REFUND_FEE_TREATMENTS = ["BUYER_ABSORBS", "REFUND_TO_BUYER", "NON_REFUNDABLE"] as const satisfies readonly RefundFeeTreatment[];

function parseRequiredString(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function parseRefundReviewDecision(value: FormDataEntryValue | null): RefundReviewDecision {
  if (typeof value !== "string" || !REFUND_REVIEW_DECISIONS.includes(value as RefundReviewDecision)) {
    throw new Error("Invalid refund review decision");
  }

  return value as RefundReviewDecision;
}

function parseOptionalRefundFeeTreatment(value: FormDataEntryValue | null, fieldName: string): RefundFeeTreatment | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !REFUND_FEE_TREATMENTS.includes(value as RefundFeeTreatment)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return value as RefundFeeTreatment;
}

export async function submitRefundReview(formData: FormData) {
  const user = await requireAdmin();
  const refundRequestId = parseRequiredString(formData.get("refundRequestId"), "refundRequestId");
  const decision = parseRefundReviewDecision(formData.get("decision"));
  const decisionReason = String(formData.get("decisionReason") || "");
  const processingFeeTreatment = parseOptionalRefundFeeTreatment(formData.get("processingFeeTreatment"), "processingFeeTreatment");
  const platformFeeTreatment = parseOptionalRefundFeeTreatment(formData.get("platformFeeTreatment"), "platformFeeTreatment");

  await reviewRefundRequest({
    refundRequestId,
    adminId: user.id,
    decision,
    decisionReason,
    processingFeeTreatment,
    platformFeeTreatment,
  });

  revalidatePath("/app/admin/verification");
  revalidatePath(`/app/admin/verification/refunds/${refundRequestId}`);
}

const DISPUTE_REVIEW_ACTIONS = ["REQUEST_INFO", "ESCALATE", "SELLER_FAVOR", "REFUND", "REOPEN"] as const;
type DisputeReviewAction = (typeof DISPUTE_REVIEW_ACTIONS)[number];

function parseDisputeReviewAction(value: FormDataEntryValue | null): DisputeReviewAction {
  if (typeof value !== "string") {
    throw new Error("Invalid dispute review action");
  }

  if (!DISPUTE_REVIEW_ACTIONS.includes(value as DisputeReviewAction)) {
    throw new Error("Invalid dispute review action");
  }

  return value as DisputeReviewAction;
}

export async function submitDisputeReview(formData: FormData) {
  const user = await requireAdmin();
  const disputeId = String(formData.get("disputeId") || "");
  const action = parseDisputeReviewAction(formData.get("action"));
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

const HOLDBACK_ACTIONS = ["APPLY", "RELEASE", "CLEAR"] as const;
type HoldbackAction = (typeof HOLDBACK_ACTIONS)[number];

function parseHoldbackAction(value: FormDataEntryValue | null): HoldbackAction {
  if (typeof value !== "string" || !HOLDBACK_ACTIONS.includes(value as HoldbackAction)) {
    throw new Error("Invalid holdback action");
  }

  return value as HoldbackAction;
}

function parseOptionalNonNegativeInteger(value: FormDataEntryValue | null, fieldName: string) {
  if (value == null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  return parsed;
}

function parseOptionalPercent(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = parseOptionalNonNegativeInteger(value, fieldName);
  if (parsed != null && parsed > 100) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }

  return parsed;
}

export async function submitHoldbackDecision(formData: FormData) {
  const user = await requireAdmin();
  const paymentIntentId = parseRequiredString(formData.get("paymentIntentId"), "paymentIntentId");
  const action = parseHoldbackAction(formData.get("action"));
  const reason = String(formData.get("reason") || "");
  const holdbackAmountCents = parseOptionalNonNegativeInteger(formData.get("holdbackAmountCents"), "holdbackAmountCents");
  const holdbackPercent = parseOptionalPercent(formData.get("holdbackPercent"), "holdbackPercent");

  await applyHoldbackDecision({
    paymentIntentId,
    actorId: user.id,
    actorRole: user.role,
    action,
    reason,
    holdbackAmountCents,
    holdbackPercent,
  });

  revalidatePath("/app/admin/verification");
  revalidatePath(`/app/admin/verification/holdbacks/${paymentIntentId}`);
}
