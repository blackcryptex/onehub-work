"use client";

import { useState, type FormEvent } from "react";

import { Card } from "@/components/ui";

type Message = {
  id: string;
  bodyMd: string;
  senderId?: string | null;
  createdAt: string | Date;
};

type Participant = {
  id?: string;
  email: string;
  roleHint?: string | null;
};

type Thread = {
  id: string;
  subject: string;
  participants: Participant[];
  messages: Message[];
};

export function MessagingThreadClient({ thread }: { thread: Thread }) {
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bodyMd = text.trim();
    if (!bodyMd) return;
    setState("sending");
    setError("");
    try {
      const response = await fetch(`/api/messages/threads/${thread.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyMd }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.message) throw new Error(data.error || "Unable to send message");
      setMessages((current) => [...current, data.message]);
      setText("");
      setState("idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unable to send message");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Card className="p-6">
        <p className="text-sm font-medium text-indigo-600">OneHub internal messaging</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">{thread.subject}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Participants: {thread.participants.map((participant) => participant.email).join(", ")}
        </p>
      </Card>

      <Card className="p-6">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-600">No messages yet. Start the conversation inside OneHub.</p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-900 whitespace-pre-wrap">{message.bodyMd}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(message.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>

        <form className="mt-4 space-y-3" onSubmit={sendMessage}>
          <textarea
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Type a message inside OneHub..."
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              disabled={state === "sending"}
              type="submit"
            >
              {state === "sending" ? "Sending..." : "Send message"}
            </button>
            {state === "error" && <span className="text-sm text-red-700">{error}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
