import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { sendOutboundEmail } from "@/lib/outbound";
import { prisma } from "@/lib/prisma";
import { isOrgAdminOrOwner } from "@/lib/rbac";
import { recordAudit } from "@/server/lib/audit";

const createAssistantInviteSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = createAssistantInviteSchema.parse(await request.json());
    const org = await prisma.organization.findUnique({
      where: { id: input.orgId },
      include: { members: true },
    });

    if (!org || !["PLANNER", "CLIENT_AGENCY"].includes(org.type)) {
      return NextResponse.json({ error: "Planner organization not found" }, { status: 404 });
    }

    const membership = org.members.find((member) => member.userId === user.id);
    if (!isAdmin(user) && !isOrgAdminOrOwner(user, org, membership)) {
      return NextResponse.json({ error: "Only planner owners/admins can invite assistants" }, { status: 403 });
    }

    const token = randomUUID();
    const invite = await prisma.invite.create({
      data: {
        orgId: org.id,
        email: input.email,
        role: input.role,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      select: { id: true, email: true, role: true, token: true, expiresAt: true, createdAt: true },
    });

    await recordAudit({
      actorId: user.id,
      orgId: org.id,
      action: "proPlanner.assistantInvite.create",
      target: invite.id,
      metadata: { email: input.email, role: input.role },
    });

    const acceptPath = `/signup?invite=${invite.token}`;
    const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const acceptUrl = new URL(acceptPath, appBaseUrl).toString();
    const delivery = await sendOutboundEmail({
      to: invite.email,
      subject: "You have been invited to join a OneHub planner team",
      text: [
        "You have been invited to join a OneHub planner team.",
        "",
        `Accept the invitation: ${acceptUrl}`,
        "",
        "If you were not expecting this invitation, you can ignore this message.",
      ].join("\n"),
    });

    const deliveryMessage =
      delivery.status === "SENT"
        ? "Assistant invite created and email sent through configured outbound provider."
        : delivery.status === "NOT_CONFIGURED"
          ? "Assistant invite created. Outbound email delivery is not configured; no email was sent by OneHub."
          : "Assistant invite created, but outbound email provider failed; no delivery confirmation was recorded.";

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        acceptPath,
      },
      delivery,
      message: deliveryMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create assistant invite" }, { status: 500 });
  }
}
