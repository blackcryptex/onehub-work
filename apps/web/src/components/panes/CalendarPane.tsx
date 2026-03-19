'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { PluginDef, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { EventItem } from '@/lib/types.event';
import { eventToGoogleEvent, taskToGoogleEvent, milestoneToGoogleEvent } from '@/lib/calendar.mapping';

// Dynamically import FullCalendar to avoid SSR issues
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading calendar...</div>
});

interface CalendarPaneProps {
  event?: EventItem;
  events?: EventItem[];
}

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  extendedProps?: {
    type: 'event'|'task'|'milestone'|'payment'|'google';
    entityId?: string;
    entityType?: string;
    description?: string;
  };
};

type GoogleOverlayEvent = {
  id?: string;
  summary?: string;
  description?: string;
  organizer?: { email?: string };
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  [key: string]: unknown;
};

export default function CalendarPane({ event, events = [] }: CalendarPaneProps) {
  const [connected, setConnected] = useState(false);
  const [showGoogleEvents, setShowGoogleEvents] = useState(false);
  const [, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleOverlayEvent[]>([]);
  const [plugins, setPlugins] = useState<PluginDef[]>([]);

  // Load plugins on mount
  useEffect(() => {
    Promise.all([
      import('@fullcalendar/daygrid').then(m => m.default as PluginDef),
      import('@fullcalendar/timegrid').then(m => m.default as PluginDef),
      import('@fullcalendar/interaction').then(m => m.default as PluginDef),
    ]).then(([dayGrid, timeGrid, interaction]) => {
      setPlugins([dayGrid, timeGrid, interaction]);
    });
  }, []);

  // Check connection status
  useEffect(() => {
    fetch('/api/google/status')
      .then(res => res.json())
      .then(data => {
        setConnected(data.connected);
        setShowGoogleEvents(data.overlay || false);
      })
      .catch(() => setConnected(false));
  }, []);

  // Load Google overlay events when enabled
  useEffect(() => {
    if (!showGoogleEvents || !connected) {
      setGoogleEvents([]);
      return;
    }

    type CalendarDomNode = HTMLElement & {
      getApi?: () => { view: { activeStart: Date; activeEnd: Date } };
    };
    const calendar = document.querySelector<CalendarDomNode>('.fc');
    if (!calendar?.getApi) return;

    const view = calendar.getApi().view;
    if (!view) return;

    const start = view.activeStart.toISOString();
    const end = view.activeEnd.toISOString();

    setLoading(true);
    fetch(`/api/google/events/overlay?timeMin=${start}&timeMax=${end}`)
      .then(res => res.json())
      .then(data => {
        const overlay = Array.isArray(data.events) ? (data.events as GoogleOverlayEvent[]) : [];
        setGoogleEvents(overlay);
        setLoading(false);
      })
      .catch(() => {
        setGoogleEvents([]);
        setLoading(false);
      });
  }, [showGoogleEvents, connected]);

  function handleConnect() {
    fetch('/api/google/connect', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          window.location.href = '/api/auth/signin/google?callbackUrl=/api/google/callback';
        }
      })
      .catch(err => {
        console.error('Connect error:', err);
        alert('Failed to connect to Google Calendar');
      });
  }

  async function handleSync() {
    setSyncLoading(true);
    try {
      // Ensure calendar exists
      await fetch('/api/google/calendar/create-or-use', { method: 'POST' });
      
      // Sync all OneHub data
      const res = await fetch('/api/google/sync/push', { method: 'POST' });
      const data = await res.json();
      
      if (data.ok) {
        alert(`Synced ${data.synced} items to Google Calendar`);
        // Refresh status
        const statusRes = await fetch('/api/google/status');
        const status = await statusRes.json();
        setShowGoogleEvents(status.overlay || false);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: unknown) {
      console.error('Sync error:', error);
      const message = error instanceof Error && error.message ? error.message : 'Failed to sync with Google';
      alert(`Failed to sync: ${message}`);
    } finally {
      setSyncLoading(false);
    }
  }

  // Build calendar events from OneHub data
  const oneHubEvents: CalendarEvent[] = useMemo(() => {
    const items: CalendarEvent[] = [];

    // Add events from the events array (or single event if provided)
    const allEvents = event ? [event] : events;
    
    for (const ev of allEvents) {
      // Event itself
      const evPayload = eventToGoogleEvent(ev);
      items.push({
        id: `event-${ev.id}`,
        title: evPayload.summary,
        start: evPayload.start.date || evPayload.start.dateTime || ev.date,
        end: evPayload.end.date || evPayload.end.dateTime,
        allDay: !!evPayload.start.date,
        color: '#6366f1', // indigo
        extendedProps: {
          type: 'event',
          entityId: ev.id,
          entityType: 'event',
          description: ev.description,
        },
      });

      // Tasks
      for (const task of ev.tasks || []) {
        const taskPayload = taskToGoogleEvent(task, ev.name);
        items.push({
          id: `task-${task.id}`,
          title: taskPayload.summary,
          start: taskPayload.start.date || taskPayload.start.dateTime || task.due,
          end: taskPayload.end.date || taskPayload.end.dateTime,
          allDay: !!taskPayload.start.date,
          color: '#3b82f6', // blue
          extendedProps: {
            type: 'task',
            entityId: task.id,
            entityType: 'task',
          },
        });
      }

      // Milestones
      for (const milestone of ev.milestones || []) {
        const milePayload = milestoneToGoogleEvent(milestone, ev.name);
        items.push({
          id: `milestone-${milestone.id}`,
          title: milePayload.summary,
          start: milePayload.start.date || milePayload.start.dateTime || milestone.targetDate,
          end: milePayload.end.date || milePayload.end.dateTime,
          allDay: !!milePayload.start.date,
          color: '#a855f7', // purple
          extendedProps: {
            type: 'milestone',
            entityId: milestone.id,
            entityType: 'milestone',
          },
        });
      }
    }

    return items;
  }, [event, events]);

  // Merge Google overlay events
  const allEvents: CalendarEvent[] = useMemo(() => {
    const merged = [...oneHubEvents];
    
    if (showGoogleEvents && googleEvents.length > 0) {
      for (const ge of googleEvents) {
        // Skip if it's from the OneHub calendar (already synced)
        if (ge.organizer?.email && ge.organizer.email.includes('onehub')) continue;
        
        merged.push({
          id: `google-${ge.id}`,
          title: ge.summary || 'Untitled',
          start: ge.start?.dateTime || ge.start?.date || '',
          end: ge.end?.dateTime || ge.end?.date,
          allDay: !!ge.start?.date,
          color: '#94a3b8', // slate
          extendedProps: {
            type: 'google',
            description: ge.description,
          },
        });
      }
    }

    return merged;
  }, [oneHubEvents, googleEvents, showGoogleEvents]);

  function handleEventClick(info: EventClickArg) {
    const evt = info.event;
    const props = evt.extendedProps as Record<string, unknown>;
    const type = typeof props.type === 'string' ? props.type : undefined;
    
    if (type === 'google') {
      // Open Google Calendar
      window.open(evt.url || 'https://calendar.google.com', '_blank');
      return;
    }

    // For OneHub events, could open a detail modal
    // For now, just show an alert
    alert(`${type ?? 'event'}: ${evt.title}`);
  }

  if (!connected) {
    return (
      <section className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Connect Google Calendar</h3>
        <p className="text-slate-600 mb-6">
          Connect your Google Calendar to sync OneHub events, tasks, and milestones.
        </p>
        <button
          onClick={handleConnect}
          className="rounded-lg px-6 py-3 text-sm font-semibold bg-[color:var(--oh-primary)] text-white hover:bg-[color:var(--oh-primary-700)]"
        >
          Connect Google Calendar
        </button>
        {/* Show OneHub-only calendar even without Google */}
        {oneHubEvents.length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold mb-4">OneHub Calendar (Local)</h4>
            <div className="rounded-lg border overflow-hidden">
              {plugins.length > 0 ? (
                <FullCalendar
                  plugins={plugins}
                  initialView="dayGridMonth"
                  events={oneHubEvents}
                  eventClick={handleEventClick}
                  height="auto"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek',
                  }}
                />
              ) : (
                <div className="p-8 text-center">Loading calendar...</div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Calendar</h3>
            <p className="text-sm text-slate-600 mt-1">
              Connected to Google Calendar
            </p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showGoogleEvents}
                onChange={(e) => setShowGoogleEvents(e.target.checked)}
              />
              Show Google events
            </label>
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className="rounded-lg px-4 py-2 text-sm font-semibold border hover:bg-slate-50 disabled:opacity-50"
            >
              {syncLoading ? 'Syncing…' : 'Sync OneHub → Google'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-5">
        {plugins.length > 0 ? (
          <FullCalendar
            plugins={plugins}
            initialView="dayGridMonth"
            events={allEvents}
            eventClick={handleEventClick}
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            datesSet={(dateInfo: DatesSetArg) => {
              // Reload Google events when view changes
              if (showGoogleEvents && connected) {
                const start = dateInfo.start.toISOString();
                const end = dateInfo.end.toISOString();
                fetch(`/api/google/events/overlay?timeMin=${start}&timeMax=${end}`)
                  .then(res => res.json())
                  .then(data => setGoogleEvents(data.events || []))
                  .catch(() => setGoogleEvents([]));
              }
            }}
          />
        ) : (
          <div className="p-8 text-center">Loading calendar...</div>
        )}
      </div>
    </section>
  );
}

