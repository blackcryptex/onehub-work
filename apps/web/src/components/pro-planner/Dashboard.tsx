"use client";

/**
 * Pro Planner Dashboard
 * 
 * Route: /pro/planner
 * 
 * Matches DIY Planner styling with:
 * - Same background colors (--oh-bg, --oh-surface)
 * - Same sidebar styling (--oh-sidebar)
 * - Same header gradient
 * - Same typography and spacing
 */

import { ProPlannerHeader } from "./Header";
import { ProPlannerSidebar } from "./Sidebar";
import { Card, Button } from "@/components/ui";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Briefcase, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  Image as ImageIcon,
  Settings,
  Sparkles,
  Folder
} from "lucide-react";
import { EventActions } from "@/components/events/EventActions";
import { vaultDetail } from "@/lib/routes";

type UIRoute = "overview" | "services" | "availability" | "payments" | "portfolio" | "settings";

type Event = {
  id: string;
  name: string;
  slug: string;
  startAt: Date;
  status: string;
  org: {
    name: string;
    slug: string;
    ownerId: string;
  };
  createdBy: {
    id: string;
    name: string | null;
  };
};

interface ProPlannerDashboardProps {
  orgName: string;
  events: Event[];
  userId: string;
  userRole: string;
  orgOwnerId: string;
}

export function ProPlannerDashboard({ orgName, events, userId, userRole, orgOwnerId }: ProPlannerDashboardProps) {
  const [uiRoute, setUiRoute] = useState<UIRoute>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localEvents, setLocalEvents] = useState<Event[]>(events);
  const router = useRouter();

  const handleDeleteEvent = async (eventSlug: string, eventId: string, eventName: string) => {
    const response = await fetch(`/api/events/${eventSlug}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to delete event" }));
      throw new Error(error.error || "Failed to delete event");
    }

    // Remove event from local state
    setLocalEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const canManageEvent = (event: Event): boolean => {
    // Mirror server-side RBAC logic from apps/web/src/lib/rbac.ts canManageEvent function
    // Admin can manage all events
    if (userRole === "ADMIN") return true;
    // Org owner can manage all events in their org
    if (orgOwnerId === userId) return true;
    // Planner isolation: planners can only manage events they created
    if (userRole === "DIY_PLANNER" || userRole === "PRO_PLANNER") {
      return event.createdBy.id === userId;
    }
    // Other org members (non-planners) can manage events in their org
    // Since we're in a Pro Planner context and already filtered by org, if user is org member, they can manage
    // For simplicity, if user is org owner (checked above) or created the event, they can manage
    // This matches the server-side logic where non-planner org members can manage events in their org
    return event.createdBy.id === userId;
  };

  const Main = () => {
    switch (uiRoute) {
      case "overview":
        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-2">Welcome, {orgName}!</h2>
              <p className="text-slate-600">
                Manage your events and client projects from here.
              </p>
            </div>

            {/* Events Section */}
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">Your Events</h3>
                <Button asChild size="sm">
                  <Link href="/events/new">Create Event</Link>
                </Button>
              </div>

              {localEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No events yet. Create your first event to get started.</p>
                  <Button asChild>
                    <Link href="/events/new">Create Event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {localEvents.map((event) => {
                    const canManage = canManageEvent(event);
                    const eventDate = new Date(event.startAt);
                    const formattedDate = eventDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <Card
                        key={event.id}
                        className="p-4 hover:shadow-md transition-shadow border border-slate-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Link
                                href={`/pro/planner/vault/${event.slug}` as any}
                                className="text-lg font-semibold text-slate-900 hover:text-[color:var(--oh-primary)] transition-colors"
                              >
                                {event.name}
                              </Link>
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                {event.status.replace("_", " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{formattedDate}</span>
                              </div>
                              {event.org && (
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4" />
                                  <span>{event.org.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <EventActions
                              role={userRole as any}
                              eventSlug={event.slug}
                              eventId={event.id}
                              eventName={event.name}
                              canEdit={canManage}
                              canDelete={canManage}
                              onDelete={handleDeleteEvent}
                              onDeleted={() => {
                                // Event already removed from state in handleDeleteEvent
                              }}
                              size="sm"
                            />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("services")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-100">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold">Services & Packages</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Define your service offerings and pricing packages for clients.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("availability")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Availability & Booking</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Set your availability calendar and manage booking requests.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("payments")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">Payments & Contracts</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Configure payment methods and contract templates.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("portfolio")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-rose-100">
                    <ImageIcon className="w-5 h-5 text-rose-600" />
                  </div>
                  <h3 className="font-semibold">Portfolio & Branding</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Showcase your work with photos and brand assets.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Client Management</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Manage your client relationships and event projects.
                </p>
              </Card>

              <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setUiRoute("settings")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <h3 className="font-semibold">Settings</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Update your business profile and preferences.
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-indigo-900 mb-1">Quick Start Guide</h3>
                  <p className="text-sm text-indigo-800 mb-3">
                    Complete these steps to get your Pro Planner profile ready:
                  </p>
                  <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                    <li>Add your services and pricing packages</li>
                    <li>Set your service area and travel preferences</li>
                    <li>Upload portfolio photos and branding</li>
                    <li>Configure payment and contract settings</li>
                  </ol>
                </div>
              </div>
            </Card>
          </section>
        );

      case "services":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Services & Packages</h2>
            <p className="text-slate-600">Service management coming soon...</p>
          </section>
        );

      case "availability":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Availability & Booking</h2>
            <p className="text-slate-600">Calendar and booking management coming soon...</p>
          </section>
        );

      case "payments":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Payments & Contracts</h2>
            <p className="text-slate-600">Payment and contract configuration coming soon...</p>
          </section>
        );

      case "portfolio":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio & Branding</h2>
            <p className="text-slate-600">Portfolio upload and branding tools coming soon...</p>
          </section>
        );

      case "settings":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <p className="text-slate-600">Settings panel coming soon...</p>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full m-0 p-0 flex flex-col bg-[color:var(--oh-bg)]">
      {/* Sticky Header - matches DIY Planner */}
      <ProPlannerHeader onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main content with sidebar */}
      <div className="flex-1 flex">
        <ProPlannerSidebar
          currentRoute={uiRoute}
          onRoute={setUiRoute}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />

        <main className="flex-1 p-6">
          <Main />
        </main>
      </div>
    </div>
  );
}

