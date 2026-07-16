import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { isPlanner, canAccessDashboard } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Folder, Calendar, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { vaultDetail } from "@/lib/routes";

/**
 * Pro Planner Event Vault List Page
 * 
 * Route: /pro/planner/vault
 * 
 * Role-guarded vault list page for PRO_PLANNER users.
 */
export default async function ProVaultPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/signin?redirect=/pro/planner/vault");
  }

  if (!canAccessDashboard(user, "PRO_PLANNER")) {
    redirect("/app");
  }

  const userId = user.id;
  const admin = isAdmin(user);
  const planner = isPlanner(user);

  // Get all user's events with data for progress/budget/contacts/feed
  // Admin sees all orgs, normal user sees only orgs they're a member of
  // Planner isolation: planners only see events they created
  const orgs = await prisma.organization.findMany({
    where: admin ? {} : { members: { some: { userId } } },
    include: {
      events: {
        where: planner ? { createdById: userId } : undefined, // Planner isolation: only show events they created
        orderBy: { startAt: "desc" },
        include: {
          createdBy: { select: { name: true, email: true } },
          budgetLines: { select: { plannedCents: true, actualCents: true } },
          milestones: { select: { id: true, title: true, dueAt: true, done: true }, orderBy: { dueAt: "asc" } },
          checklists: { 
            select: { 
              id: true, 
              title: true,
              items: { select: { id: true, done: true } }
            } 
          },
          org: { select: { owner: { select: { name: true, email: true } } } },
          activities: { select: { id: true, action: true, at: true }, orderBy: { at: "desc" }, take: 5 },
        },
      },
    },
  });

  const allEvents = orgs.flatMap((org) =>
    org.events.map((event) => ({
      ...event,
      orgName: org.name,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Vault</h1>
          <p className="text-slate-600 mt-1">All your events organized in one place</p>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Folder className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No events yet</h2>
          <p className="text-slate-600 mb-6">Create your first event using the Event Wizard</p>
          <Button asChild>
            <Link href="/events/new">Create Event</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allEvents.map((ev) => {
            const planned = ev.budgetLines.reduce((a, l) => a + l.plannedCents, 0);
            const actual = ev.budgetLines.reduce((a, l) => a + l.actualCents, 0);
            const checklistTotal = ev.checklists.reduce((sum, c) => sum + c.items.length, 0);
            const checklistDone = ev.checklists.reduce((sum, c) => sum + c.items.filter((i) => i.done).length, 0);
            const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
            const ownerName = ev.org.owner?.name || ev.createdBy?.name || "";
            const upcoming = ev.milestones.find((m) => !m.done) || null;
            return (
              <Link key={ev.id} href={vaultDetail(user.role, ev.slug) as any}>
                <Card className="p-5 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">At a glance</h3>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold truncate">{ev.name}</h4>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(ev.startAt).toLocaleDateString()}</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{ev.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {checklistDone}/{checklistTotal} checklist items done
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Budget</div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>${(actual / 100).toFixed(0)}</span>
                        <span className="text-slate-500">of ${(planned / 100).toFixed(0)}</span>
                      </div>
                      {planned > 0 && (
                        <div className="mt-1 h-1 w-full rounded bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full ${
                              Math.round((actual / planned) * 100) > 90
                                ? "bg-rose-600"
                                : Math.round((actual / planned) * 100) > 75
                                ? "bg-amber-600"
                                : "bg-green-600"
                            }`}
                            style={{ width: `${Math.min(Math.round((actual / planned) * 100), 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Main Contact</div>
                      <div className="text-sm font-medium flex items-center gap-1">
                        <Users className="w-4 h-4" /> {ownerName || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
                    <div>
                      <div className="font-medium mb-1">Upcoming</div>
                      {upcoming ? (
                        <div className="rounded border border-slate-200 p-2">
                          <div className="truncate">{upcoming.title}</div>
                          <div className="text-slate-500">{new Date(upcoming.dueAt).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <div className="text-slate-500">No upcoming milestones</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium mb-1">Recent</div>
                      {ev.activities && ev.activities.length > 0 && ev.activities[0] ? (
                        <div className="rounded border border-slate-200 p-2">
                          <div className="truncate">{ev.activities[0].action}</div>
                          <div className="text-slate-500">{new Date(ev.activities[0].at).toLocaleString()}</div>
                        </div>
                      ) : (
                        <div className="text-slate-500">No recent activity</div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {allEvents.length > 0 && (
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Timeline &amp; Notifications</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="font-medium mb-2">Upcoming Tasks</div>
              <ul className="space-y-2 text-sm">
                {allEvents
                  .flatMap((ev) => ev.milestones.filter((m) => !m.done).map((m) => ({ ev, m })))
                  .sort((a, b) => (a.m.dueAt?.getTime?.() || 0) - (b.m.dueAt?.getTime?.() || 0))
                  .slice(0, 5)
                  .map(({ ev, m }) => {
                    const days = Math.ceil((m.dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const color = days <= 3 ? "text-rose-600" : days <= 7 ? "text-amber-600" : "text-slate-600";
                    return (
                      <li key={m.id} className="flex items-center justify-between">
                        <span className="truncate mr-2">{m.title} — <span className="text-slate-500">{ev.name}</span></span>
                        <span className={`text-xs ${color}`}>{days}d</span>
                      </li>
                    );
                  })}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="font-medium mb-2">Alerts</div>
              <ul className="space-y-2 text-sm">
                {allEvents
                  .flatMap((ev) => ev.activities.map((a) => ({ ev, a })))
                  .slice(0, 5)
                  .map(({ ev, a }) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span className="truncate mr-2">{a.action} — <span className="text-slate-500">{ev.name}</span></span>
                      <span className="text-xs text-slate-500">{new Date(a.at).toLocaleString()}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="font-medium mb-2">Smart Suggestions</div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>• You haven't booked a photographer yet. 90 days remaining.</li>
                <li>• Finalize guest list to generate seating chart.</li>
                <li>• Confirm catering numbers based on RSVPs.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

