import { Card, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { canManageEvent, canEditEvent, canDeleteEvent, isPlanner, canAccessDashboard } from "@/lib/rbac";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  Bell,
  Lightbulb,
  FileCheck,
  CreditCard,
  FileText,
} from "lucide-react";
import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
import { EventActions } from "@/components/events/EventActions";
import { ShareEventButton } from "@/components/events/ShareEventButton";
import { StakeholdersSectionClient } from "@/components/vault/StakeholdersSectionClient";
import { AiSourceVendorsVenuesPanel } from "@/components/vault/AiSourceVendorsVenuesPanel";
import { DemoTour } from "@/components/vault/DemoTour";
import { getVaultBasePath, proposalDetail } from "@/lib/routes";
import { requireAuthorizedEventBySlug } from "@/lib/event-access";

/**
 * DIY Planner Event Vault Detail Page
 * 
 * Route: /diy-planner/vault/[eventSlug]
 * 
 * Role-guarded vault detail page for DIY_PLANNER users.
 * This is a standalone implementation (not a wrapper) to avoid redirect loops.
 */
export default async function DIYVaultDetailPage({ 
  params 
}: { 
  params: Promise<{ eventSlug: string }>;
}) {
  const resolvedParams = await params;
  const eventSlug = resolvedParams.eventSlug;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/signin?redirect=/diy-planner/vault");
  }

  if (!canAccessDashboard(user, "DIY_PLANNER")) {
    // For demo friendliness, redirect to demo launcher if not authorized
    redirect("/demo");
  }

  const userId = user.id;
  const { event: authorizedEvent } = await requireAuthorizedEventBySlug(eventSlug, "manage");
  const vaultBasePath = getVaultBasePath(user.role);

  let event;
  try {
    event = await prisma.event.findUnique({
      where: { id: authorizedEvent.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        org: {
          include: {
            owner: { select: { name: true, email: true } },
            members: {
              where: { userId: userId },
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        stakeholders: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        shares: {
          select: { viewerUserId: true, scope: true },
          where: { scope: "SUMMARY" },
        },
        budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
        milestones: { orderBy: { dueAt: "asc" } },
        checklists: { 
          include: { items: { select: { id: true, done: true, title: true } } },
          orderBy: { title: "asc" } 
        },
        guestLists: {
          include: {
            guests: { include: { invitations: { select: { respondedAt: true, sentAt: true } } } },
          },
        },
        bookingRequests: {
          include: { 
            listing: { 
              select: { 
                id: true,
                title: true,
                type: true,
                category: true,
              } 
            } 
          },
          orderBy: { createdAt: "desc" },
        },
        shortlistItems: {
          include: {
            listing: {
              include: {
                org: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        proposals: { 
          include: { 
            milestones: { select: { id: true, status: true, amountCents: true } }
          }, 
          orderBy: { createdAt: "desc" } 
        },
        activities: { orderBy: { at: "desc" }, take: 20 },
      },
    });
  } catch (error) {
    console.error("[DIY Vault] Error loading event:", error);
    if (error instanceof Error && error.message.includes("shortlistItems")) {
      event = await prisma.event.findUnique({
        where: { id: authorizedEvent.id },
        include: {
          createdBy: { select: { name: true, email: true } },
          org: {
            include: {
              owner: { select: { name: true, email: true } },
              members: {
                where: { userId: userId },
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
          stakeholders: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          shares: {
            select: { viewerUserId: true, scope: true },
            where: { scope: "SUMMARY" },
          },
          budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
          milestones: { orderBy: { dueAt: "asc" } },
          checklists: { 
            include: { items: { select: { id: true, done: true, title: true } } },
            orderBy: { title: "asc" } 
          },
          guestLists: {
            include: {
              guests: { include: { invitations: { select: { respondedAt: true, sentAt: true } } } },
            },
          },
          bookingRequests: {
            include: { 
              listing: { 
                select: { 
                  id: true,
                  title: true,
                  type: true,
                  category: true,
                } 
              } 
            },
            orderBy: { createdAt: "desc" },
          },
          proposals: { 
            include: { 
              milestones: { select: { id: true, status: true, amountCents: true } }
            }, 
            orderBy: { createdAt: "desc" } 
          },
          activities: { orderBy: { at: "desc" }, take: 20 },
        },
      });
    } else {
      throw error;
    }
  }

  if (!event) {
    return notFound();
  }

  const canManage = canManageEvent(user, event);
  const canEdit = canEditEvent(user, event);
  const canDelete = canDeleteEvent(user, event);

  const planned = event.budgetLines.reduce((a, l) => a + l.plannedCents, 0);
  const actual = event.budgetLines.reduce((a, l) => a + l.actualCents, 0);
  const budgetPercent = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const checklistTotal = event.checklists.reduce((sum, c) => sum + c.items.length, 0);
  const checklistDone = event.checklists.reduce((sum, c) => sum + c.items.filter((i) => i.done).length, 0);
  const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const guestList = event.guestLists[0];
  const totalGuests = guestList?.guests.length || 0;
  const rsvped = guestList?.guests.filter((g) => g.status === "ACCEPTED").length || 0;
  const rsvpPending = guestList?.guests.filter((g) => g.status === "PENDING").length || 0;

  const upcomingMilestones = event.milestones.filter((m) => !m.done && m.dueAt && new Date(m.dueAt) > new Date()).slice(0, 5);
  const upcomingChecklist = event.checklists.flatMap((c) => c.items.filter((i) => !i.done)).slice(0, 5);

  const vendorPending = event.bookingRequests.filter((b) => b.status === "PENDING").length;
  const paymentsDue = event.proposals.flatMap((p) => p.milestones.filter((m) => m.status === "PENDING")).length;
  const paymentsReceived = event.proposals.flatMap((p) => p.milestones.filter((m) => m.status === "PAID")).length;

  const mainContacts = [
    event.org.owner,
    ...event.org.members.slice(0, 2).map((m) => m.user),
  ].filter(Boolean);

  const statusColors: Record<string, string> = {
    PLANNING: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELED: "bg-rose-100 text-rose-700",
  };

  const firstProposal = event.proposals[0];
  const firstContract = firstProposal ? await prisma.contract.findUnique({
    where: { proposalId: firstProposal.id },
    select: { id: true },
  }) : null;

  const isDemoModeEnabled = process.env.ONEHUB_DEMO_MODE === "true";

  return (
    <div className="space-y-6">
      {isDemoModeEnabled && (
        <DemoTour
          eventSlug={eventSlug}
          eventId={event.id}
          proposalId={firstProposal?.id}
          contractId={firstContract?.id}
          show={true}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.startAt).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[event.status] || statusColors.PLANNING}`}>
              {event.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (user.role === "PRO_PLANNER" || user.role === "DIY_PLANNER" || isAdmin(user)) && (
            <ShareEventButton
              eventSlug={eventSlug}
              stakeholders={(event as any).stakeholders || []}
              shares={(event as any).shares || []}
            />
          )}
          <EventActions
            role={user.role}
            eventSlug={eventSlug}
            eventId={event.id}
            eventName={event.name}
            canEdit={canEdit}
            canDelete={canDelete}
            size="sm"
          />
          <Button asChild variant="secondary">
            <Link href={vaultBasePath as any}>← Back to Vault</Link>
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">At a glance</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Progress</div>
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="mt-2 h-2 w-full rounded bg-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {checklistDone}/{checklistTotal} items done
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Budget</div>
            <div className={`text-2xl font-bold ${budgetPercent > 90 ? "text-rose-600" : budgetPercent > 75 ? "text-amber-600" : "text-slate-900"}`}>
              ${(actual / 100).toFixed(0)}
            </div>
            <div className="text-sm text-slate-600">of ${(planned / 100).toFixed(0)}</div>
            <div className="mt-2 h-2 w-full rounded bg-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all ${budgetPercent > 90 ? "bg-rose-600" : budgetPercent > 75 ? "bg-amber-600" : "bg-green-600"}`}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Main Contacts</div>
            <div className="space-y-1">
              {mainContacts.slice(0, 2).map((contact, i) => (
                <div key={i} className="text-sm font-medium flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  {contact?.name || "—"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Guests</div>
            <div className="text-2xl font-bold">{rsvped}</div>
            <div className="text-sm text-slate-600">of {totalGuests} invited</div>
            <div className="mt-1 text-xs text-slate-500">{rsvpPending} pending</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5" /> Timeline &amp; Notifications
              </h2>
              <span className="text-xs text-slate-500">Auto-updating</span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Upcoming Tasks
                </h3>
                <div className="space-y-2">
                  {[...upcomingMilestones.map(m => ({ title: m.title, dueAt: m.dueAt })), ...upcomingChecklist.map(i => ({ title: i.title, dueAt: null }))].slice(0, 8).map((item, i) => {
                    const dueDate = item.dueAt ? new Date(item.dueAt) : new Date(event.startAt);
                    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 3;
                    const isWarning = daysUntil <= 7;
                    const colorClass = isUrgent ? "border-rose-300 bg-rose-50" : isWarning ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50";
                    const textColor = isUrgent ? "text-rose-700" : isWarning ? "text-amber-700" : "text-slate-700";
                    return (
                      <div key={i} className={`rounded border p-3 ${colorClass}`}>
                        <div className={`text-sm font-medium ${textColor}`}>
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Due in {daysUntil} {daysUntil === 1 ? "day" : "days"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Vendor Updates
                </h3>
                <div className="space-y-2">
                  {event.bookingRequests.slice(0, 5).map((booking) => {
                    const isConfirmed = booking.status === "QUOTED";
                    return (
                      <div key={booking.id} className={`rounded border p-3 ${isConfirmed ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                        <div className="text-sm font-medium">
                          {isConfirmed ? "✓" : "⏳"} {booking.listing.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{booking.status}</div>
                      </div>
                    );
                  })}
                  {vendorPending > 0 && (
                    <div className="text-xs text-slate-500">{vendorPending} pending bookings</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payments
                </h3>
                <div className="space-y-2">
                  {paymentsDue > 0 && (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3">
                      <div className="text-sm font-medium text-amber-700">{paymentsDue} payment(s) due</div>
                    </div>
                  )}
                  {paymentsReceived > 0 && (
                    <div className="rounded border border-green-300 bg-green-50 p-3">
                      <div className="text-sm font-medium text-green-700">{paymentsReceived} payment(s) received</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Guest RSVPs
                </h3>
                <div className="space-y-2">
                  {guestList?.guests.filter((g) => g.status === "ACCEPTED").slice(0, 3).map((guest) => (
                    <div key={guest.id} className="rounded border border-green-300 bg-green-50 p-3">
                      <div className="text-sm font-medium text-green-700">✓ {guest.firstName} {guest.lastName} accepted</div>
                    </div>
                  ))}
                  {rsvpPending > 0 && (
                    <div className="text-xs text-slate-500">{rsvpPending} RSVPs pending</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Milestones Reached
                </h3>
                <div className="space-y-2">
                  {event.checklists.filter((c) => c.items.every(i => i.done)).slice(0, 3).map((checklist) => (
                    <div key={checklist.id} className="rounded border border-green-300 bg-green-50 p-3">
                      <div className="text-sm font-medium text-green-700">✓ {checklist.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Smart Suggestions
                </h3>
                <div className="space-y-2">
                  {vendorPending === 0 && (
                    <div className="rounded border border-indigo-300 bg-indigo-50 p-3">
                      <div className="text-sm font-medium text-indigo-700">{"💡 You haven't booked a photographer yet. 90 days remaining."}</div>
                    </div>
                  )}
                  {rsvpPending > 10 && (
                    <div className="rounded border border-indigo-300 bg-indigo-50 p-3">
                      <div className="text-sm font-medium text-indigo-700">💡 Finalize guest list to generate seating chart.</div>
                    </div>
                  )}
                  {checklistDone < checklistTotal * 0.5 && (
                    <div className="rounded border border-indigo-300 bg-indigo-50 p-3">
                      <div className="text-sm font-medium text-indigo-700">💡 Complete more checklist items to keep on track.</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Recent Activity</h3>
                <div className="space-y-2">
                  {event.activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm text-slate-700">{activity.action}</div>
                      <div className="text-xs text-slate-500 mt-1">{new Date(activity.at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {canManage && (user.role === "PRO_PLANNER" || user.role === "DIY_PLANNER" || isAdmin(user)) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Manage Clients</h3>
              <StakeholdersSectionClient
                eventSlug={eventSlug}
                stakeholders={((event as any).stakeholders || []).map((s: any) => ({
                  id: s.id,
                  userId: s.userId,
                  role: s.role,
                  user: {
                    id: s.user.id,
                    name: s.user.name,
                    email: s.user.email,
                  },
                }))}
              />
            </Card>
          )}

          {(event as any).stakeholders && (event as any).stakeholders.length > 0 && !canManage && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Stakeholders & Sharing</h3>
              <div className="space-y-3">
                {(event as any).stakeholders.map((stakeholder: any) => {
                  const isShared = (event as any).shares?.some(
                    (s: any) => s.viewerUserId === stakeholder.userId && s.scope === "SUMMARY"
                  ) || false;
                  return (
                    <div
                      key={stakeholder.userId}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {stakeholder.user?.name || stakeholder.user?.email || "Unknown User"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {stakeholder.role === "CLIENT" ? "Client" : "Stakeholder"}
                          {isShared && (
                            <span className="ml-2 text-green-600">• Summary shared</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="text-base font-semibold mb-4">Event Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Event Type</div>
                <div className="font-medium">{event.type.replace(/_/g, " ")}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Location</div>
                <div className="font-medium">{event.venueCity || "—"}, {event.venueState || ""}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Expected Guests</div>
                <div className="font-medium">{event.guestTarget || "—"}</div>
              </div>
              {event.objective && (
                <div>
                  <div className="text-xs text-slate-500">Objective</div>
                  <div className="font-medium">{event.objective}</div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={`/events/${eventSlug}/guests`}>Manage Guest List</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={`/events/${eventSlug}/budget`}>View Budget</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href={`/events/${eventSlug}/checklists`}>Checklists</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Proposals
              </h3>
              <div className="flex gap-2">
                <GenerateProposalButton eventId={event.id} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="mb-6">
                <AiSourceVendorsVenuesPanel 
                  eventId={event.id} 
                  eventName={event.name}
                  eventLocation={event.venueCity && event.venueState 
                    ? `${event.venueCity}, ${event.venueState}` 
                    : event.venueCity || undefined}
                />
              </div>

              {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) ? (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-slate-700">Generate Proposals from Shortlist:</h4>
                  <div className="space-y-2">
                    {(event.shortlistItems as any[]).map((item: any) => (
                      <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-sm font-medium">{item.listing.title}</div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.listing.type === "VENUE" ? "Venue" : "Vendor"} • {item.listing.category}
                              {item.listing.org.city && ` • ${item.listing.org.city}, ${item.listing.org.state}`}
                            </div>
                            {item.notes && (
                              <div className="text-xs text-slate-400 mt-1 italic">{item.notes}</div>
                            )}
                            <div className="mt-2 text-xs text-slate-600">
                              Ready to reach out? Open this listing with your event attached to request booking.
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Button asChild size="sm" variant="secondary">
                              <Link
                                href={`/marketplace/${item.listing.slug}?eventId=${event.id}&eventSlug=${event.slug}&eventName=${encodeURIComponent(event.name)}&returnTo=${encodeURIComponent(`/diy-planner/vault/${event.slug}`)}`}
                              >
                                Request booking
                              </Link>
                            </Button>
                            <GenerateProposalButton 
                              eventId={event.id} 
                              listingId={item.listingId}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {event.proposals.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-slate-700">Existing Proposals:</h4>
                  <div className="space-y-2">
                    {event.proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              <Link href={proposalDetail(proposal.id) as any} className="hover:underline">
                                {proposal.title}
                              </Link>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Status: {proposal.status} • ${(proposal.totalCents / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(!('shortlistItems' in event) || !event.shortlistItems || !Array.isArray(event.shortlistItems) || event.shortlistItems.length === 0) && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                      <p className="text-sm text-indigo-900 mb-2">
                        <strong>💡 Tip:</strong> To generate vendor/venue-specific proposals, first add vendors or venues to your shortlist.
                      </p>
                      <p className="text-xs text-indigo-700">
                        Browse the marketplace with this event attached, shortlist a vendor or venue, then come back here to generate a proposal.
                        You can also generate a generic AI proposal for this event using the button above.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/marketplace?eventId=${event.id}&eventSlug=${event.slug}&eventName=${encodeURIComponent(event.name)}&returnTo=${encodeURIComponent(`/diy-planner/vault/${event.slug}`)}`}>
                            Browse marketplace for this event
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href="/app/requests">View booking requests</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-slate-500">
                    {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) 
                      ? "Select a vendor/venue above to generate a proposal, or use the button above for a generic proposal."
                      : "No proposals yet. Generate one to get started."}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
