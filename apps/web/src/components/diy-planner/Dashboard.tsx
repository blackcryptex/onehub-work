"use client";

/**
 * DIY Planner Dashboard
 * 
 * Route: /app/diy-planner
 * 
 * Single-page application with:
 * - Header (gradient, sticky)
 * - Left Sidebar (navigation with links & tabs)
 * - Main content area
 * - Footer (global)
 */

import { Header } from "./Header";
import DIYSidebar from "./DIYSidebar";
import EventManagementSection from "@/components/EventManagementSection";
import CalendarPane from "@/components/panes/CalendarPane";
import { Overview } from "@/components/overview/Overview";
import { EventWizard } from "@/components/event-wizard/EventWizard";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { EventItem } from "@/lib/types";
import { EventItem as EventItemExtended } from "@/lib/types.event";
import { adaptEventToNewFormat, adaptEventToOldFormat } from "@/lib/eventAdapter";
import { aiAssist, type AssistKind } from "@/lib/aiAssist";
import { useToast } from "@/hooks/useToast";
import { EventActions } from "@/components/events/EventActions";
import { EmptyStateOnboarding } from "@/components/overview/EmptyStateOnboarding";
import { useSession } from "next-auth/react";

type UIRoute =
  | "overview"
  | "vault"
  | "calendar"
  | "vendors"
  | "proposals"
  | "contracts"
  | "budget"
  | "guests"
  | "tasks"
  | "wizard"
  | "eventDetail";

// Wrapper component to handle useSearchParams (must be in a client component with Suspense)
export function DIYPlannerDashboard() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  // URL -> uiRoute bootstrap with validation and safe fallback
  const initialRoute = useMemo<UIRoute>(() => {
    const raw = searchParams.get('view');
    const allowed: UIRoute[] = ['overview', 'vault', 'calendar', 'vendors', 'proposals', 'contracts', 'budget', 'guests', 'tasks', 'wizard', 'eventDetail'];
    return (allowed.includes(raw as UIRoute) ? (raw as UIRoute) : 'overview');
  }, [searchParams]);

  const [uiRoute, setUiRoute] = useState<UIRoute>(initialRoute);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { success, error } = useToast();
  const { data: session } = useSession();

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      console.log("[DIY Dashboard] Fetching events from /api/diy/events");
      const res = await fetch("/api/diy/events", { cache: "no-store" });
      console.log("[DIY Dashboard] Response status:", res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[DIY Dashboard] API error:", {
          status: res.status,
          statusText: res.statusText,
          errorText,
        });
        throw new Error(`Failed to load events: ${res.status} ${res.statusText}`);
      }
      
      const data = (await res.json()) as { events: EventItem[] };
      console.log("[DIY Dashboard] Events received:", {
        count: data.events.length,
        eventIds: data.events.map((e) => e.id),
        eventNames: data.events.map((e) => e.name),
      });
      
      setEvents(data.events);
      return data.events;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load events";
      console.error("[DIY Dashboard] Error fetching events:", err);
      setEvents([]);
      setEventsError(message);
      error(message);
      return [];
    } finally {
      setLoadingEvents(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0]?.id ?? null);
      return;
    }
    if (selectedEventId && events.every((event) => event.id !== selectedEventId)) {
      setSelectedEventId(events[0]?.id ?? null);
    }
  }, [events, selectedEventId]);

  // Sync URL with route state (without navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (uiRoute === 'overview') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', uiRoute);
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [uiRoute]);


  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const handleAIAssist = async (kind: AssistKind) => {
    try {
      const result = await aiAssist(kind, { eventId: selectedEventId });
      if (result.ok) {
        success(result.message);
      } else {
        error(result.message);
      }
    } catch {
      error("AI Assist failed. Please try again.");
    }
  };

  const handleEventChange = (patch: Partial<EventItemExtended>) => {
    if (!selectedEventId) return;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === selectedEventId) {
          const newFormatEvent = adaptEventToNewFormat(e);
          const updated = { ...newFormatEvent, ...patch };
          return adaptEventToOldFormat(updated);
        }
        return e;
      })
    );
  };

  const handleEventCreated = (newEvent: EventItem, eventId: string, _slug: string) => {
    // Add the new event to state immediately (no refetch needed)
    setEvents((prev) => {
      // Check if event already exists (shouldn't happen, but be safe)
      if (prev.some((e) => e.id === eventId)) {
        return prev;
      }
      // Add new event and sort by date (ascending, same as sidebar)
      const updated = [...prev, newEvent];
      return updated.sort((a, b) => a.date.localeCompare(b.date));
    });
    
    // Select the new event and navigate to detail view
    setSelectedEventId(eventId);
    setUiRoute('eventDetail');
    success('Event created successfully!');
  };

  const handleEventDeleted = () => {
    // Refetch events after deletion
    void fetchEvents();
    // Clear selection if deleted event was selected
    setSelectedEventId(null);
    setUiRoute('overview');
    success('Event deleted successfully');
  };

  const Main = () => {
    if (uiRoute !== "wizard" && loadingEvents) {
      return (
        <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
          <h2 className="text-xl font-semibold">Loading events…</h2>
          <p className="text-slate-600 mt-1">Please wait while we fetch your events.</p>
        </section>
      );
    }

    if (uiRoute !== "wizard" && eventsError) {
      return (
        <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6 space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Unable to load events</h2>
            <p className="text-slate-600 mt-1">{eventsError}</p>
          </div>
          <button
            onClick={() => fetchEvents()}
            className="rounded-lg px-3 py-1.5 text-sm border hover:bg-slate-50"
          >
            Retry
          </button>
        </section>
      );
    }

    if (uiRoute !== "wizard" && events.length === 0) {
      return (
        <section className="space-y-6">
          <EmptyStateOnboarding
            title="Welcome to DIY Planner"
            description="Create your first event to unlock your vault, budget, guests, tasks, and timeline. OneHub will seed the basics so you can refine instead of starting from scratch."
            ctaLabel="Launch event wizard"
            secondaryActionLabel={uiRoute === "overview" ? undefined : "Go to overview"}
            onSecondaryAction={uiRoute === "overview" ? undefined : () => setUiRoute("overview")}
            onCreateEvent={() => setUiRoute("wizard")}
          />
        </section>
      );
    }

    switch (uiRoute) {
      case "overview":
        return (
          <section className="space-y-6">
            <Overview 
              events={events.map(e => adaptEventToNewFormat(e))}
              selectedEventId={selectedEventId}
              onCreateEvent={() => setUiRoute("wizard")}
              onNavigateToTab={(eventId) => {
                setSelectedEventId(eventId);
                setUiRoute("eventDetail");
                // Note: Tab will default to 'vendors', but EventManagementSection can be enhanced
                // to accept an initialTab prop in the future
              }}
              onNavigateToEvent={(eventId) => {
                setSelectedEventId(eventId);
                setUiRoute("eventDetail");
              }}
            />
          </section>
        );

      case "vault":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold">Event Vault</h2>
            <p className="text-slate-600 mt-1">
              Your events are listed in the sidebar. Click any event to see details.
            </p>
          </section>
        );

      case "eventDetail":
        return selectedEvent ? (
          <section className="space-y-6">
            {/* Top header block */}
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* LEFT: Date → Name → Location */}
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {new Date(selectedEvent.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                  <h1 className="mt-1 text-xl md:text-2xl font-semibold text-slate-800">
                    {selectedEvent.name}
                  </h1>
                  <p className="mt-1 text-slate-600">
                    {selectedEvent.location ?? "Location TBD"}
                  </p>
                </div>

                {/* RIGHT: Actions &amp; progress */}
                <div className="w-full md:w-80">
                  <div className="flex items-center gap-2 justify-end">
                    {selectedEvent.slug && (
                      <EventActions
                        role={session?.user?.role as any}
                        eventSlug={selectedEvent.slug}
                        eventId={selectedEvent.id}
                        eventName={selectedEvent.name}
                        canEdit={true} // DIY planners can always edit their own events
                        canDelete={true} // DIY planners can delete their own events
                        onDeleted={handleEventDeleted}
                        size="sm"
                        showLabels={true}
                      />
                    )}
                    <button
                      className="rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                      onClick={() => handleAIAssist("overview")}
                    >
                      AI Assist
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                      onClick={() => console.log("Share link")}
                    >
                      Share
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-sm text-slate-500">Overall Progress</div>
                    <div className="mt-2 h-2 rounded bg-slate-100">
                      <div
                        className="h-2 rounded bg-[color:var(--oh-primary)]"
                        style={{ width: `${selectedEvent.progress}%` }}
                      />
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {Math.round(selectedEvent.progress)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <p className="mt-4 text-slate-700">{selectedEvent.description}</p>
              )}
            </div>

            {/* Action Bar + Panes */}
            <EventManagementSection 
              event={adaptEventToNewFormat(selectedEvent)} 
              onEventChange={handleEventChange} 
            />
          </section>
        ) : (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-slate-900">No event selected</h2>
              <p className="mt-2 text-slate-600">
                Pick an event from the sidebar, return to your overview, or create a new event to keep planning.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setUiRoute("wizard")}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setUiRoute("overview")}
                  className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 transition-colors"
                >
                  Return to Overview
                </button>
              </div>
            </div>
          </section>
        );

      case "calendar":
        return (
          <CalendarPane
            events={events.map(e => adaptEventToNewFormat(e))}
            event={selectedEvent ? adaptEventToNewFormat(selectedEvent) : undefined}
          />
        );
      case "vendors":
      case "proposals":
      case "contracts":
      case "budget":
      case "guests":
      case "tasks":
        return (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold capitalize">{uiRoute}</h2>
            <p className="text-slate-600 mt-1">Content for {uiRoute} goes here.</p>
          </section>
        );

      case "wizard":
        return (
          <EventWizard
            onClose={() => setUiRoute("overview")}
            onCreated={handleEventCreated}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full m-0 p-0 flex flex-col bg-[color:var(--oh-bg)]">
      {/* Sticky Header */}
      <Header onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Main content with sidebar */}
      <div className="flex-1 flex">
        <DIYSidebar
          events={events}
          selectedEventId={selectedEventId}
          onRoute={setUiRoute}
          onSelectEvent={setSelectedEventId}
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
