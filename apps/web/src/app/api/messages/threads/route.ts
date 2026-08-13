import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ThreadListItem = {
  id: string;
  subject: string;
  createdAt: Date;
  participants: Array<{ email: string; roleHint?: string | null }>;
  messages: Array<{ bodyMd: string; createdAt: Date; senderId?: string | null }>;
  event?: { name: string } | null;
  listing?: { title: string } | null;
  org?: { name: string } | null;
};

function summarizeThread(thread: ThreadListItem) {
  const contextParts = [thread.event?.name, thread.listing?.title || thread.org?.name].filter(Boolean);
  const lastMessage = thread.messages[0];

  return {
    id: thread.id,
    subject: thread.subject,
    createdAt: thread.createdAt.toISOString(),
    href: `/messages/${thread.id}`,
    contextLabel: contextParts.length ? contextParts.join(" · ") : "OneHub conversation",
    lastMessagePreview: lastMessage?.bodyMd || "No messages yet",
    lastMessageAt: lastMessage?.createdAt.toISOString() ?? thread.createdAt.toISOString(),
    participants: thread.participants.map((participant) => ({
      email: participant.email,
      roleHint: participant.roleHint,
    })),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threads = await prisma.thread.findMany({
    where: {
      OR: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { email: user.email } } },
        { org: { ownerId: user.id } },
        { org: { members: { some: { userId: user.id } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      event: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true } },
      org: { select: { id: true, name: true, ownerId: true } },
    },
  });

  return NextResponse.json({ threads: threads.map(summarizeThread) });
}
