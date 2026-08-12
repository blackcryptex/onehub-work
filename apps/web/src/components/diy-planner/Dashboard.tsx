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
import { useSearchParams } from "next/navigation";
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
  | "settings"
  | "help"
  | "wizard"
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

type DIYHelpTopic = {
  id: string;
  category: "Getting started" | "Event design" | "Vendors and venues" | "Budget and payments" | "Using OneHub" | "When you are stuck";
  title: string;
  summary: string;
  steps: string[];
  searchTerms: string[];
  nextAction: string;
};

const DIY_HELP_TOPICS: DIYHelpTopic[] = [
  {
    id: "first-step",
    category: "Getting started",
    title: "What should I do first?",
    summary: "Start by saving the event basics so OneHub can organize vendors, budget, guests, contracts, and tasks around one event.",
    steps: [
      "Click Create Event and enter the event type, date, location, guest count, style, and budget range.",
      "Open the Event Vault after the event is saved to review the event summary and planning status.",
      "Use the Tasks tab to turn the event into next actions instead of keeping everything in your head.",
    ],
    searchTerms: ["start", "first", "create", "new event", "setup", "event basics"],
    nextAction: "Create the event, then open the Event Vault.",
  },
  {
    id: "design-event",
    category: "Event design",
    title: "How do I design the event?",
    summary: "Design starts with the guest experience: what people should feel, see, eat, hear, and remember.",
    steps: [
      "Write the event goal in plain language, such as elegant wedding, relaxed birthday, or polished company dinner.",
      "Choose three design words for the mood, like modern, warm, formal, colorful, romantic, or family-friendly.",
      "Match the design to practical choices: venue layout, food style, music, lighting, dress code, photos, and guest flow.",
      "Use the Budget tab to keep design choices realistic before asking vendors for proposals.",
    ],
    searchTerms: ["design", "theme", "style", "mood", "layout", "decor", "vision", "experience"],
    nextAction: "Open Budget before requesting design-heavy vendors.",
  },
  {
    id: "vendor-questions",
    category: "Vendors and venues",
    title: "What should I ask vendors?",
    summary: "Ask questions that prove fit, availability, price, scope, cancellation rules, and what is included before you compare proposals.",
    steps: [
      "Confirm the vendor is available for your date, time, location, guest count, and event type.",
      "Ask what is included, what costs extra, what setup/breakdown needs exist, and who your day-of contact will be.",
      "Ask for payment schedule, cancellation terms, insurance or license needs, and what they need from you to perform well.",
      "Keep answers attached to the selected event so proposals, contracts, and messages stay organized.",
    ],
    searchTerms: ["vendor", "vendors", "questions", "ask", "quote", "proposal", "contract", "availability"],
    nextAction: "Shortlist two or three vendors before choosing.",
  },
  {
    id: "find-caterer",
    category: "Vendors and venues",
    title: "How do I find a caterer, DJ, photographer, or venue?",
    summary: "Search by category, compare fit against your event details, then shortlist the best matches before sending requests.",
    steps: [
      "Open Vendors from your DIY sidebar or event workspace.",
      "Pick the category you need, such as catering, DJ, photography, florist, rentals, transportation, or venue.",
      "Compare location, style, guest count fit, budget range, availability, profile details, and response quality.",
      "Shortlist the strongest options and request clear proposals tied to your event.",
    ],
    searchTerms: ["caterer", "catering", "dj", "photographer", "photo", "venue", "florist", "rentals", "find vendor", "book"],
    nextAction: "Open Vendors and search by category.",
  },
  {
    id: "proposal-contract",
    category: "Budget and payments",
    title: "Compare proposals before signing",
    summary: "Do not pick only by price. Compare the full scope, dates, payment milestones, cancellation terms, and what each vendor promises to deliver.",
    steps: [
      "Open Proposals for the selected event and review each vendor's scope, price, and included services.",
      "Check whether taxes, fees, travel, setup, staffing, rentals, overtime, and gratuity are included or separate.",
      "Move to Contracts only when the proposal matches what you want and the terms are clear.",
      "Use Payments and milestones to understand deposit timing before taking payment action.",
    ],
    searchTerms: ["proposal", "proposals", "contract", "sign", "compare", "milestone", "payment", "deposit", "budget"],
    nextAction: "Open Proposals, then Contracts only after scope is clear.",
  },
  {
    id: "navigate-onehub",
    category: "Using OneHub",
    title: "Where do I go to do each task?",
    summary: "The sidebar is your map: Overview for status, Event Vault for the saved event, Vendors for provider search, Budget for money, Guests and Tasks for planning work.",
    steps: [
      "Use Overview when you need the big picture and next event status.",
      "Use Event Vault when you need the event summary, sharing path, and saved event workspace.",
      "Use Vendors, Proposals, Contracts, Budget, Guests, and Tasks for the selected event's actual planning work.",
      "Use Messages when you need conversations in one place instead of scattered email or text threads.",
    ],
    searchTerms: ["navigate", "where", "dashboard", "vault", "messages", "tasks", "guests", "budget", "how to use"],
    nextAction: "Pick the sidebar item that matches the task you are trying to finish.",
  },
  {
    id: "stuck",
    category: "When you are stuck",
    title: "I am stuck — what should I do?",
    summary: "Name the blocker, search Help for the task, open the related OneHub area, and contact support if the next step is still unclear.",
    steps: [
      "Write the blocker as one sentence, like I need a caterer, I do not understand this proposal, or I need to change my guest count.",
      "Search Help using the task word, such as caterer, budget, contract, guest list, timeline, venue, or payment.",
      "Open the related sidebar area and check the selected event first so support can see the right context.",
      "If you still need help, email support with the event name, what you tried, and what decision you need help making.",
    ],
    searchTerms: ["stuck", "help", "support", "question", "problem", "blocked", "confused", "what next"],
    nextAction: "Search the task, then contact support if the next step is still unclear.",
  },
];

function toEventManagementTab(tab: string): EventManagementTab {
  return EVENT_MANAGEMENT_TABS.includes(tab as EventManagementTab) ? (tab as EventManagementTab) : "vendors";
}

// Wrapper component to handle useSearchParams (must be in a client component with Suspense)
export function DIYPlannerDashboard() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  
  // URL -> uiRoute bootstrap with validation and safe fallback
  const initialRoute = useMemo<UIRoute>(() => {
    const raw = searchParams.get('view');
    const allowed: UIRoute[] = ['overview', 'vault', 'calendar', 'vendors', 'proposals', 'contracts', 'budget', 'guests', 'tasks', 'settings', 'help', 'wizard', 'eventDetail'];
    return (allowed.includes(raw as UIRoute) ? (raw as UIRoute) : 'overview');
  }, [searchParams]);

  const [uiRoute, setUiRoute] = useState<UIRoute>(initialRoute);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventInitialTab, setSelectedEventInitialTab] = useState<EventManagementTab>("vendors");
  const [helpSearch, setHelpSearch] = useState("");
  const [helpCategory, setHelpCategory] = useState<DIYHelpTopic["category"] | "All">("All");
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

    if (uiRoute !== "wizard" && uiRoute !== "help" && uiRoute !== "settings" && events.length === 0) {
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

      case "help": {
        const normalizedHelpSearch = helpSearch.trim().toLowerCase();
        const categories: (DIYHelpTopic["category"] | "All")[] = [
          "All",
          "Getting started",
          "Event design",
          "Vendors and venues",
          "Budget and payments",
          "Using OneHub",
          "When you are stuck",
        ];
        const visibleHelpTopics = DIY_HELP_TOPICS.filter((topic) => {
          const matchesCategory = helpCategory === "All" || topic.category === helpCategory;
          const searchable = [topic.title, topic.summary, topic.category, topic.nextAction, ...topic.steps, ...topic.searchTerms]
            .join(" ")
            .toLowerCase();
          const matchesSearch = normalizedHelpSearch.length === 0 || searchable.includes(normalizedHelpSearch);
          return matchesCategory && matchesSearch;
        });

        return (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Help</p>
              <h2 className="text-xl font-semibold text-slate-900">DIY Planner Help</h2>
              <p className="mt-2 max-w-3xl text-slate-600">
                Search practical planning guidance and OneHub navigation steps for getting an event done, from first setup through design, vendors, proposals, contracts, payments, guests, and tasks.
              </p>
              <label htmlFor="diy-help-search" className="mt-5 block text-sm font-medium text-slate-700">
                Search DIY help
              </label>
              <input
                id="diy-help-search"
                type="search"
                value={helpSearch}
                onChange={(event) => setHelpSearch(event.target.value)}
                placeholder="Try caterer, design, budget, contract, guest list, venue, payment, or what next"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-4 flex flex-wrap gap-2" aria-label="DIY help categories">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setHelpCategory(category)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      helpCategory === category
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
              <h3 className="font-semibold text-amber-950">Quick guidance when you do not know what to do next</h3>
              <p className="mt-2 text-sm text-amber-900">
                If you are stuck, use Help to search the task, open the related OneHub area, or contact support with your event name and blocker.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visibleHelpTopics.map((topic) => (
                <article key={topic.id} className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{topic.category}</p>
                  <h3 className="mt-2 font-semibold text-slate-900">{topic.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{topic.summary}</p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    {topic.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    Next action: {topic.nextAction}
                  </p>
                </article>
              ))}
            </div>

            {visibleHelpTopics.length === 0 && (
              <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
                <h3 className="font-semibold text-slate-900">No exact help result yet</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Try a simpler task word like vendor, budget, contract, design, venue, caterer, guests, payment, or what next. If it is still unclear, contact support with your event name and the step you are trying to finish.
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <h3 className="font-semibold text-slate-900">Need support?</h3>
              <p className="mt-2 text-sm text-slate-600">
                Contact the OneHub support team at{" "}
                <a href="mailto:support@onehub.events" className="font-medium text-indigo-600 hover:underline">
                  support@onehub.events
                </a>{" "}
                with your event name, what you searched for, and the exact step blocking you.
              </p>
            </div>
          </section>
        );
      }

      case "settings":
        return selectedEvent ? (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Settings</p>
                  <h2 className="text-xl font-semibold text-slate-900">Event settings</h2>
                  <p className="mt-2 max-w-2xl text-slate-600">
                    Manage the selected event’s saved basics and planning workspace actions without changing unsupported account settings.
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
            </div>
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <h3 className="font-semibold text-slate-900">{selectedEvent.name}</h3>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate-500">Date</dt>
                  <dd className="mt-1 text-slate-900">{new Date(selectedEvent.date).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Location</dt>
                  <dd className="mt-1 text-slate-900">{selectedEvent.location ?? "Location TBD"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Planning progress</dt>
                  <dd className="mt-1 text-slate-900">{Math.round(selectedEvent.progress)}%</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {selectedEvent.slug ? (
                  <Link
                    href={`/diy-planner/vault/${selectedEvent.slug}`}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 text-center text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Open event vault
                  </Link>
                ) : (
                  <span className="text-sm text-slate-500">Save the event before opening a vault link.</span>
                )}
                <button
                  type="button"
                  onClick={() => setUiRoute("eventDetail")}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Return to event workspace
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900">Select or create an event first</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Event settings are scoped to a saved event. Select an event from the sidebar or create one before editing event details.
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
                    {selectedEvent.slug ? (
                      <Link
                        href={`/diy-planner/vault/${selectedEvent.slug}`}
                        className="rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                        title="Open the event vault to manage safe summary sharing."
                      >
                        Share
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 text-slate-400 cursor-not-allowed"
                        disabled
                        title="Sharing is unavailable until this event has a saved vault link."
                      >
                        Share unavailable
                      </button>
                    )}
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
      case "vendors":
      case "proposals":
      case "contracts":
      case "budget":
      case "guests":
      case "tasks":
        return selectedEvent ? (
          <section className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Planning workspace</p>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedEvent.name}</h2>
                  <p className="mt-1 text-slate-600">
                    {selectedEvent.location ?? "Location TBD"} · {new Date(selectedEvent.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUiRoute("eventDetail")}
                  className="rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50"
                >
                  Event summary
                </button>
              </div>
            </div>
            <EventManagementSection
              event={adaptEventToNewFormat(selectedEvent)}
              initialTab={toEventManagementTab(uiRoute)}
              onEventChange={handleEventChange}
            />
          </section>
        ) : (
          <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900">Choose an event to plan</h2>
            <p className="text-slate-600 mt-1">
              Select an event from the sidebar or create a new event to manage {uiRoute}.
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
