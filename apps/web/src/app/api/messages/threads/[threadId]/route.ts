import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ threadId: string }> };

type ThreadForAccess = {
  participants: Array<{ userId?: string | null; email: string }>;
  org?: { ownerId: string; members?: Array<{ userId: string }> } | null;
};

function canAccessThread(user: { id: string; email: string; role?: string }, thread: ThreadForAccess) {
  if (isAdmin(user)) return true;
  if (thread.participants.some((participant) => participant.userId === user.id || participant.email === user.email)) return true;
  if (thread.org?.ownerId === user.id) return true;
  if (thread.org?.members?.some((member) => member.userId === user.id)) return true;
  return false;
}

async function loadAuthorizedThread(threadId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "asc" } },
      org: { select: { ownerId: true, members: { select: { userId: true } } } },
    },
  });

  if (!thread) return { error: NextResponse.json({ error: "Thread not found" }, { status: 404 }) };
  if (!canAccessThread(user, thread)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { thread, user };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { threadId } = await context.params;
  const result = await loadAuthorizedThread(threadId);
  if (result.error) return result.error;
  return NextResponse.json({ thread: result.thread });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { threadId } = await context.params;
  const result = await loadAuthorizedThread(threadId);
  if (result.error) return result.error;

  const body = (await request.json().catch(() => ({}))) as { bodyMd?: string; attachments?: string[] };
  const bodyMd = body.bodyMd?.trim();
  if (!bodyMd) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      threadId,
      senderId: result.user!.id,
      bodyMd,
      attachments: body.attachments ?? [],
    },
  });

  return NextResponse.json({ message });
}
