import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createRefundRequest } from "@/lib/refund-request";
import { recordActivity } from "@/server/lib/activity";

const createRefundRequestSchema = z.object({
  proposalId: z.string(),
  milestoneId: z.string().optional(),
  amountRequestedCents: z.number().int().positive(),
  reason: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    const rawBody = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const body = createRefundRequestSchema.parse({
      ...rawBody,
      amountRequestedCents: Number(rawBody.amountRequestedCents),
      milestoneId: rawBody.milestoneId ? String(rawBody.milestoneId) : undefined,
    });
    const proposal = await prisma.proposal.findUnique({
      where: { id: body.proposalId },
      include: { event: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        orgId: proposal.event.orgId,
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const refundRequest = await createRefundRequest({
      actorId: user.id,
      actorRole: user.role,
      proposalId: body.proposalId,
      milestoneId: body.milestoneId,
      amountRequestedCents: body.amountRequestedCents,
      reason: body.reason,
      orgId: proposal.event.orgId,
      requestContextId: request.headers.get("x-request-id"),
    });

    await recordActivity({
      orgId: proposal.event.orgId,
      eventId: proposal.eventId,
      actorId: user.id,
      action: "REFUND_REQUEST_SUBMITTED",
      target: refundRequest.id,
      meta: {
        refundRequestId: refundRequest.id,
        proposalId: proposal.id,
        milestoneId: body.milestoneId,
        amountRequestedCents: body.amountRequestedCents,
      },
    });

    if (contentType.includes("application/json")) {
      return NextResponse.json({ success: true, refundRequest });
    }

    return NextResponse.redirect(new URL("/disputes", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create refund request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
