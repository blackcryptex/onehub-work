import Link from "next/link";
import type { Route } from "next";
import { ThreadPanel } from "@onehub/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { notFound, redirect } from "next/navigation";

type ThreadMessage = {
  id: string;
  bodyMd: string;
  createdAt: string;
  senderId?: string | null;
};

export default async function MessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const resolvedParams = await params;
  const thread = await prisma.thread.findFirst({
    where: {
      id: resolvedParams.threadId,
      org: { members: { some: { userId: user.id } } },
    },
    include: {
      org: { select: { name: true } },
      event: { select: { name: true, slug: true } },
      listing: { select: { title: true, type: true } },
      proposal: { select: { title: true, status: true } },
      participants: { select: { email: true, roleHint: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) return notFound();

  const messages: ThreadMessage[] = thread.messages.map((message) => ({
    id: message.id,
    bodyMd: message.bodyMd,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId ?? null,
  }));

  const context = thread.event?.name ?? thread.proposal?.title ?? thread.listing?.title ?? thread.org.name;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/messages" className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
          ← Back to Message Inbox
        </Link>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Message thread</p>
        <h1 className="text-2xl font-bold">{thread.subject}</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          {context} / {thread.participants.length} participant{thread.participants.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-medium text-slate-900">Organization</p>
          <p className="mt-1 text-slate-600">{thread.org.name}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Event / listing</p>
          <p className="mt-1 text-slate-600">{context}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Workflow</p>
          <p className="mt-1 text-slate-600">Review recorded coordination context before taking action in the event or proposal workspace.</p>
        </div>
      </section>

      <ThreadPanel messages={messages} />

      {thread.event?.slug && (
        <Link href={`/events/${thread.event.slug}` as Route} className="inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-900">
          Open event workspace →
        </Link>
      )}
    </div>
  );
}
