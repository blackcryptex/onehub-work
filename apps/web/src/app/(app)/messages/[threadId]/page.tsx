import { ThreadPanel } from "@onehub/ui";
import { db } from "@/server/db";
import { notFound } from "next/navigation";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: Date;
  senderId?: string | null;
};

export default async function MessageThreadPage({ params }: { params: { threadId: string } }) {
  const thread = await db.thread.findUnique({
    where: { id: params.threadId },
    include: { messages: { include: { thread: true } } },
  });
  if (!thread) return notFound();
  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    bodyMd: message.bodyMd,
    createdAt: message.createdAt,
    senderId: message.senderId ?? null,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{thread.subject}</h1>
      <ThreadPanel messages={messages} onSend={() => {}} />
    </div>
  );
}

