"use client";

import * as React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";

type Message = { id: string; bodyMd: string; createdAt: string | Date; senderId?: string | null };

export function ThreadPanel({ messages, onSend }: { messages: Message[]; onSend?: (body: string) => void | Promise<void> }) {
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSending, setIsSending] = React.useState(false);
  const canSend = typeof onSend === "function";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSend) return;
    const body = text.trim();
    if (!body) return;
    setError(null);
    setIsSending(true);
    try {
      await onSend(body);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Messages</h3>
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            No messages are recorded in this thread yet.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm border-b pb-2">
              <div className="font-medium">{new Date(m.createdAt).toLocaleString()}</div>
              <div>{m.bodyMd}</div>
            </div>
          ))
        )}
      </div>
      {canSend ? (
        <form onSubmit={handleSubmit}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="mt-2" disabled={isSending || !text.trim()}>{isSending ? "Sending..." : "Send"}</Button>
        </form>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          This thread is read-only for your role. Registered participants with send access can reply from this canonical message detail.
        </p>
      )}
    </Card>
  );
}
