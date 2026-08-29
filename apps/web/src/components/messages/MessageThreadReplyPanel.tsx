"use client";

import { useRouter } from "next/navigation";
import { ThreadPanel } from "@onehub/ui";
import { useToast } from "@/hooks/useToast";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: string;
  senderId?: string | null;
};

export function MessageThreadReplyPanel({
  threadId,
  messages,
  canReply,
}: {
  threadId: string;
  messages: ThreadMessage[];
  canReply: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  async function sendReply(bodyMd: string) {
    const response = await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bodyMd }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Message could not be sent");
    }

    toast.success("Reply saved and in-app notifications created for registered participants.");
    router.refresh();
  }

  return <ThreadPanel messages={messages} onSend={canReply ? sendReply : undefined} />;
}
