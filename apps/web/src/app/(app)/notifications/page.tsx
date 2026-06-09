import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function isInternalRoute(value: string | null): value is Route {
  return Boolean(value?.startsWith("/"));
}

export default async function NotificationsPage({ searchParams }: { searchParams: { status?: string; type?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(searchParams.status === "unread" ? { read: false } : {}),
      ...(searchParams.status === "read" ? { read: true } : {}),
      ...(searchParams.type ? { type: { contains: searchParams.type, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-slate-600">Local in-app notification history for your account. Email/SMS delivery remains stub/mock-only in this Gate 6B slice.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{unreadCount} unread in current view</div>
      </div>

      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
        <select name="status" defaultValue={searchParams.status || "all"} className="rounded border px-3 py-2">
          <option value="all">All statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <input name="type" defaultValue={searchParams.type} placeholder="Notification type" className="rounded border px-3 py-2 md:col-span-2" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Filter</button>
      </form>

      <section className="rounded-xl border bg-white">
        <div className="border-b px-4 py-3 font-semibold">Latest notifications</div>
        <div className="divide-y">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications found for this filter.</div>
          ) : (
            notifications.map((notification) => (
              <article key={notification.id} className={`space-y-2 px-4 py-3 text-sm ${notification.read ? "" : "bg-blue-50/50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{notification.title}</div>
                  <div className="text-xs text-slate-500">{notification.createdAt.toLocaleString()}</div>
                </div>
                {notification.body && <p className="text-slate-600">{notification.body}</p>}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{notification.type}</span>
                  <span>{notification.read ? "read" : "unread"}</span>
                  {isInternalRoute(notification.link) ? <Link href={notification.link} className="text-indigo-600 hover:underline">Open linked record →</Link> : <span>No link</span>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
