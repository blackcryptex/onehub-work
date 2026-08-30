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
import type { EventManagementTab } from "@/components/EventManagementSection";
import CalendarPane from "@/components/panes/CalendarPane";
import { Overview } from "@/components/overview/Overview";
import { EventWizard } from "@/components/event-wizard/EventWizard";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EventItem } from "@/lib/types";
import { EventItem as EventItemExtended } from "@/lib/types.event";
import { adaptEventToNewFormat, adaptEventToOldFormat } from "@/lib/eventAdapter";
import { aiAssist, type AssistKind } from "@/lib/aiAssist";
import { useToast } from "@/hooks/useToast";
import { EventActions } from "@/components/events/EventActions";
import { EmptyStateOnboarding } from "@/components/overview/EmptyStateOnboarding";
import { useSession } from "next-auth/react";
import type { Role } from "@onehub/types/src/roles";

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
  | "settings"
  | "help"
  | "shareAccess"
  | "messages"
  | "eventDetail";

const EVENT_MANAGEMENT_TABS: EventManagementTab[] = [
  "vendors",
  "proposals",
  "contracts",
  "budget",
  "guests",
  "tasks",
  "milestones",
];

function toEventManagementTab(tab: string): EventManagementTab {
  return EVENT_MANAGEMENT_TABS.includes(tab as EventManagementTab) ? (tab as EventManagementTab) : "vendors";
}

// Wrapper component to handle useSearchParams (must be in a client component with Suspense)
export function DIYPlannerDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  // URL -> uiRoute bootstrap with validation and safe fallback
  const initialRoute = useMemo<UIRoute>(() => {
    const raw = searchParams.get('view');
    const allowed: UIRoute[] = ['overview', 'vault', 'calendar', 'vendors', 'proposals', 'contracts', 'budget', 'guests', 'tasks', 'wizard', 'settings', 'help', 'shareAccess', 'messages', 'eventDetail'];
    return (allowed.includes(raw as UIRoute) ? (raw as UIRoute) : 'overview');
  }, [searchParams]);

  const [uiRoute, setUiRoute] = useState<UIRoute>(initialRoute);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventInitialTab, setSelectedEventInitialTab] = useState<EventManagementTab>("vendors");
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

  const handleShare = () => {
    if (selectedEvent?.slug) {
      router.push(`/diy-planner/vault/${selectedEvent.slug}` as any);
      return;
    }
    setUiRoute("shareAccess");
  };

  const goToEventTab = (tab: EventManagementTab) => {
    if (!selectedEventId && events[0]?.id) {
      setSelectedEventId(events[0].id);
    }
    setSelectedEventInitialTab(tab);
    setUiRoute("eventDetail");
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

  const GuidedCockpit = () => {
    const eventCount = events.length;
    const selectedName = selectedEvent?.name ?? events[0]?.name ?? "your event";
    const flowSteps: Array<{
      label: string;
      helper: string;
      onClick: () => void;
    }> = [
      {
        label: "Dream up event",
        helper: "Start with the vision, date, city, and guest target.",
        onClick: () => setUiRoute("overview"),
      },
      {
        label: "Create event",
        helper: "Use the wizard when the event does not exist yet.",
        onClick: () => setUiRoute("wizard"),
      },
      {
        label: "Add needs",
        helper: "Turn budget, guest, task, and milestone needs into the plan.",
        onClick: () => goToEventTab("tasks"),
      },
      {
        label: "Find vendors/venue",
        helper: "Shortlist venues and vendors for this event.",
        onClick: () => goToEventTab("vendors"),
      },
      {
        label: "Compare proposals",
        helper: "Review quotes before deciding who to book.",
        onClick: () => goToEventTab("proposals"),
      },
      {
        label: "Track contracts/payment readiness",
        helper: "Watch signature status and payment readiness before booking is final.",
        onClick: () => goToEventTab("contracts"),
      },
    ];

    return (
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">DIY planning cockpit</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Dream, plan, book, track</h1>
            <p className="mt-2 text-sm text-slate-700">
              Next for {selectedName}: follow the guided path from event idea to vendor decisions,
              contracts, and payment readiness. You have {eventCount} event{eventCount === 1 ? "" : "s"} in the Event Vault.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={() => setUiRoute("calendar")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setUiRoute("messages")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Messages
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flowSteps.map((step, index) => (
            <button
              key={step.label}
              type="button"
              aria-label={step.label}
              onClick={step.onClick}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <span className="text-xs font-semibold text-indigo-600">Step {index + 1}</span>
              <span className="mt-1 block text-sm font-bold text-slate-950">{step.label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{step.helper}</span>
            </button>
          ))}
        </div>
      </section>
    );
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
            <GuidedCockpit />
            <Overview 
              events={events.map(e => adaptEventToNewFormat(e))}
              selectedEventId={selectedEventId}
              onCreateEvent={() => setUiRoute("wizard")}
              onNavigateToTab={(eventId, tab) => {
                setSelectedEventId(eventId);
                setSelectedEventInitialTab(toEventManagementTab(tab));
                setUiRoute("eventDetail");
              }}
              onNavigateToEvent={(eventId) => {
                setSelectedEventId(eventId);
                setSelectedEventInitialTab("vendors");
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
            <GuidedCockpit />
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
                        role={session?.user?.role as Role | undefined}
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
                      onClick={handleShare}
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
              initialTab={selectedEventInitialTab}
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
      case "shareAccess":
        return selectedEvent ? (
          <section className="space-y-6">
            <GuidedCockpit />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Share access</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Open canonical client sharing</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Client sharing is managed from the event vault detail page so access control, stakeholder records,
                    and client-safe summaries stay in one persisted path. Open the vault detail when this event has a route.
                  </p>
                </div>
                {selectedEvent.slug && (
                  <EventActions
                    role={session?.user?.role as Role | undefined}
                    eventSlug={selectedEvent.slug}
                    eventId={selectedEvent.id}
                    eventName={selectedEvent.name}
                    canEdit={true}
                    canDelete={true}
                    onDeleted={handleEventDeleted}
                    size="sm"
                    showLabels={true}
                  />
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setUiRoute("eventDetail")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Back to event cockpit
                </button>
                <button
                  type="button"
                  onClick={() => selectedEvent.slug ? router.push(`/diy-planner/vault/${selectedEvent.slug}` as any) : setUiRoute("eventDetail")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open event vault sharing
                </button>
              </div>
            </div>
          </section>
        ) : null;
      case "messages":
        return selectedEvent ? (
          <section className="space-y-6">
            <GuidedCockpit />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Messages</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">No message thread connected yet</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                OneHub has proposal and contract thread surfaces, but this DIY event does not expose a connected
                message thread from the cockpit yet. Review proposals or contracts to continue vendor-facing work.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setUiRoute("proposals")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Review proposals
                </button>
                <button
                  type="button"
                  onClick={() => setUiRoute("contracts")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Review contracts
                </button>
              </div>
            </div>
          </section>
        ) : null;
      case "settings":
        return (
          <section className="space-y-6">
            <GuidedCockpit />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">DIY planner settings</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Account preferences and notification controls are not connected to this DIY cockpit yet.
                Keep planning here, and use your profile account settings when broader account controls are needed.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setUiRoute("overview")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Back to overview
                </button>
                <button
                  type="button"
                  onClick={() => setUiRoute("help")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open help
                </button>
              </div>
            </div>
          </section>
        );
      case "help":
        return (
          <section className="space-y-6">
            <GuidedCockpit />
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Help</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">DIY planner help</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                A guided support surface for DIY planning questions is now connected to role-based guidance
                for event creation, vendor and venue sourcing, tasks, proposals, contracts, and guarded payment-readiness basics.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => goToEventTab("tasks")}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Review event tasks
                </button>
                <Link href="/help/roles/diy-planner" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Open DIY planner guides
                </Link>
                <Link href="/help/articles/diy-create-event" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Event creation guide
                </Link>
                <Link href="/help/articles/source-vendors-and-venues" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Vendor and venue sourcing guide
                </Link>
              </div>
            </div>
          </section>
        );
      case "vendors":
      case "proposals":
      case "contracts":
      case "budget":
      case "guests":
      case "tasks":
        return selectedEvent ? (
          <section className="space-y-6">
            <GuidedCockpit />
            <EventManagementSection
              event={adaptEventToNewFormat(selectedEvent)}
              initialTab={toEventManagementTab(uiRoute)}
              onEventChange={handleEventChange}
            />
          </section>
        ) : (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900">Choose an event first</h2>
            <p className="mt-2 text-slate-600">
              Select an event from the Event Vault or create a new event before opening {uiRoute}.
            </p>
            <button
              type="button"
              onClick={() => setUiRoute("wizard")}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create event
            </button>
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
