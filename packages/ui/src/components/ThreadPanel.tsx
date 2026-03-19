"use client";

import * as React from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";

type Message = { id: string; bodyMd: string; createdAt: string | Date; senderId?: string | null };

export function ThreadPanel({ messages, onSend }: { messages: Message[]; onSend: (body: string) => void }) {
  const [text, setText] = React.useState("");
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">Messages</h3>
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="text-sm border-b pb-2">
            <div className="font-medium">{new Date(m.createdAt).toLocaleString()}</div>
            <div>{m.bodyMd}</div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSend(text); setText(""); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" className="mt-2">Send</Button>
      </form>
    </Card>
  );
}

