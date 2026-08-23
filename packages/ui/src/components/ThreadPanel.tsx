"use client";

import * as React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";

type Message = { id: string; bodyMd: string; createdAt: string | Date; senderId?: string | null };

export function ThreadPanel({ messages, onSend }: { messages: Message[]; onSend?: (body: string) => void }) {
  const [text, setText] = React.useState("");
  const canSend = typeof onSend === "function";

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
        <form onSubmit={(e) => { e.preventDefault(); onSend(text); setText(""); }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
          <Button type="submit" className="mt-2">Send</Button>
        </form>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Replies are handled from the connected event or proposal workflow in this MVP. Use this view to review the recorded thread context.
        </p>
      )}
    </Card>
  );
}
