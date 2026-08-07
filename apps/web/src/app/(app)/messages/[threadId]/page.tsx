import { notFound, redirect } from "next/navigation";

import { MessagingThreadClient } from "@/components/messages/MessagingThreadClient";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ threadId: string }> };

function canAccessThread(user: { id: string; email: string; role?: string }, thread: {
  participants: Array<{ userId?: string | null; email: string }>;
  org?: { ownerId: string; members: Array<{ userId: string }> } | null;
}) {
  if (isAdmin(user)) return true;
  if (thread.participants.some((participant) => participant.userId === user.id || participant.email === user.email)) return true;
  if (thread.org?.ownerId === user.id) return true;
  if (thread.org?.members.some((member) => member.userId === user.id)) return true;
  return false;
}

export default async function MessageThreadPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const { threadId } = await params;
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: true,
      messages: { orderBy: { createdAt: "asc" } },
      org: { select: { ownerId: true, members: { select: { userId: true } } } },
    },
  });

  if (!thread) notFound();
  if (!canAccessThread(user, thread)) redirect("/app");

  return (
    <MessagingThreadClient
      thread={{
        id: thread.id,
        subject: thread.subject,
        participants: thread.participants.map((participant) => ({
          id: participant.id,
          email: participant.email,
          roleHint: participant.roleHint,
        })),
        messages: thread.messages.map((message) => ({
          id: message.id,
          bodyMd: message.bodyMd,
          senderId: message.senderId,
          createdAt: message.createdAt.toISOString(),
        })),
      }}
    />
  );
}
