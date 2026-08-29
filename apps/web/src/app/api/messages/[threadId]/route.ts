import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/server/db";
import { requireThreadSendAccess } from "@/server/lib/access";
import { recordActivity } from "@/server/lib/activity";

const sendMessageInput = z.object({
  bodyMd: z.string().trim().min(1, "Message body is required"),
  attachments: z.array(z.string()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { threadId } = await params;
  const parsed = sendMessageInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message payload" }, { status: 400 });
  }

  try {
    const thread = await requireThreadSendAccess(user, threadId);
    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          threadId,
          senderId: user.id,
          bodyMd: parsed.data.bodyMd,
          attachments: parsed.data.attachments ?? undefined,
        },
      });

      await tx.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

      const recipientIds = Array.from(new Set(
        thread.participants
          .map((participant) => participant.userId)
          .filter((userId): userId is string => Boolean(userId && userId !== user.id))
      ));

      if (recipientIds.length > 0) {
        await tx.notification.createMany({
          data: recipientIds.map((userId) => ({
            userId,
            orgId: thread.orgId,
            type: "IN_APP_MESSAGE_CREATED",
            title: "New in-app message",
            body: thread.subject,
            link: `/messages/${thread.id}`,
          })),
        });
      }

      if (thread.eventId) {
        await recordActivity({
          db: tx,
          orgId: thread.orgId,
          eventId: thread.eventId,
          actorId: user.id,
          action: "MESSAGE_CREATED",
          target: created.id,
          meta: { threadId: thread.id },
        });
      }

      return created;
    });

    return NextResponse.json({ message });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : null;
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    if (code === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw error;
  }
}
