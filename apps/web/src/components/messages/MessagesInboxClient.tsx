"use client";

import { Card } from "@/components/ui";

type InboxThread = {
  id: string;
  subject: string;
  href: string;
  contextLabel: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  participants: Array<{ email: string; roleHint?: string | null }>;
};

export function MessagesInboxClient({ threads }: { threads: InboxThread[] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card className="p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Event-community communication</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">OneHub messages</h1>
        <p className="mt-2 text-sm text-slate-600">
          Keep client, planner, vendor, and venue handoffs in one accountable place.
        </p>
      </Card>

      {threads.length === 0 ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">No active OneHub conversations yet.</h2>
          <p className="mt-2 text-sm text-slate-600">
            Threads will appear after booking requests, proposal questions, venue holds, or vendor follow-ups create a shared conversation.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Card key={thread.id} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{thread.contextLabel}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{thread.subject}</h2>
                  <p className="mt-2 text-sm text-slate-700">{thread.lastMessagePreview}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {thread.participants.map((participant) => participant.email).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-xs text-slate-500">{new Date(thread.lastMessageAt).toLocaleString()}</p>
                  <a
                    className="mt-3 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    href={thread.href}
                  >
                    Open {thread.subject}
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
