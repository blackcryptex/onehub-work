import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { safePrismaResult } from "@/lib/runtime-route-safety";
import { canReadThread } from "@/server/lib/access";

export const dynamic = "force-dynamic";

function roleLabel(role: string | null | undefined) {
  if (role === "PRO_PLANNER") return "Pro planner";
  if (role === "DIY_PLANNER") return "DIY planner";
  if (role === "VENDOR") return "Vendor";
  if (role === "VENUE") return "Venue";
  if (role === "ADMIN") return "Admin";
  return "Team";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "No message date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No message date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const userEmail = user.email?.toLowerCase();

  const accessWhere =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { org: { ownerId: user.id } },
            { org: { members: { some: { userId: user.id } } } },
            { participants: { some: { userId: user.id } } },
            ...(userEmail ? [{ participants: { some: { email: { equals: userEmail, mode: "insensitive" as const } } } }] : []),
            { listing: { org: { ownerId: user.id } } },
            { listing: { org: { members: { some: { userId: user.id } } } } },
          ],
        };

  const candidateThreads = await safePrismaResult("messages.thread.findMany", prisma.thread.findMany({
    where: {
      org: { is: {} },
      ...accessWhere,
    },
    include: {
      org: { include: { members: true } },
      event: {
        include: {
          org: { include: { members: true } },
          shares: { select: { viewerUserId: true, scope: true } },
          stakeholders: { select: { userId: true, role: true } },
        },
      },
      listing: { include: { org: { include: { members: true } } } },
      proposal: { select: { title: true, status: true } },
      participants: { select: { email: true, roleHint: true, userId: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  }), []);

  const userOrgIds = new Set<string>();
  const threads = candidateThreads.filter((thread) => canReadThread(user, thread, userOrgIds)).slice(0, 50);

  const label = roleLabel(user.role);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{label} follow-up inbox</p>
        <h1 className="text-2xl font-bold">Message inbox</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Review client, vendor, venue, proposal, and internal planning threads connected to organizations you can access.
        </p>
        <Link href="/help/articles/pro-planner-send-message" className="mt-3 inline-flex text-sm font-medium text-indigo-700 hover:text-indigo-900">
          How to send a message →
        </Link>
      </div>

      <section className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">Recent threads</div>
        <div className="divide-y">
          {threads.length === 0 ? (
            <div className="px-4 py-8 text-sm text-slate-600">
              <p className="font-medium text-slate-900">No message threads need your attention.</p>
              <p className="mt-1">Client, vendor, venue, proposal, and internal planning conversations will appear here once they are attached to your organization records.</p>
            </div>
          ) : (
            threads.map((thread) => {
              const latestMessage = thread.messages[0];
              const context = thread.event?.name ?? thread.proposal?.title ?? thread.listing?.title ?? thread.org?.name ?? "Organization unavailable";
              return (
                <Link key={thread.id} href={`/messages/${thread.id}` as Route} className="block px-4 py-4 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{thread.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{context} / {thread.participants.length} participant{thread.participants.length === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(latestMessage?.createdAt ?? thread.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{latestMessage?.bodyMd ?? "Thread is ready for the first message."}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
