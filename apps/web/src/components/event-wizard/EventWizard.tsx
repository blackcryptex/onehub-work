'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Label } from '@/components/ui';
import { Calendar, Users, Target, Palette, MessageSquare, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import type { EventItem } from '@/lib/types';

type EventWizardProps = {
  onClose: () => void;
  onCreated?: (event: EventItem, eventId: string, slug: string) => void;
  initialEvent?: EventItem | null;
};

export function EventWizard({ onClose, onCreated, initialEvent }: EventWizardProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialEvent?.name || '',
    eventTypeRaw: '', // Free-text event type
    date: initialEvent?.date ? new Date(initialEvent.date).toISOString().split('T')[0] : '',
    city: initialEvent?.city || '',
    state: '',
    zipCode: '',
    headcount: '',
    budgetRaw: '', // Free-text budget
    venue: initialEvent?.location || '',
    objective: initialEvent?.description || '',
    style: '',
  });

  useEffect(() => {
    // Check for pending event data after sign in
    if (session?.user) {
      const pending = sessionStorage.getItem('pendingEvent');
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          setFormData(prev => ({ ...prev, ...parsed }));
          sessionStorage.removeItem('pendingEvent');
        } catch (err) {
          console.error('Error parsing pending event:', err);
        }
      }
    }
  }, [session]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateEvent = async () => {
    // Validate required fields
    if (!formData.name || !formData.eventTypeRaw || !formData.budgetRaw || !formData.date) {
      alert('Please fill in all required fields (Event Name, Event Type, Budget, and Date).');
      setLoading(false);
      return;
    }

    // Check if user is authenticated
    if (!session?.user) {
      // Save form data to sessionStorage and redirect to sign in
      sessionStorage.setItem('pendingEvent', JSON.stringify(formData));
      window.location.href = '/signin?redirect=/diy-planner&createEvent=true';
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify({
          name: formData.name,
          event_type_raw: formData.eventTypeRaw,
          budget_raw: formData.budgetRaw,
          date: formData.date,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          headcount: formData.headcount,
          venue: formData.venue,
          objective: formData.objective,
          style: formData.style,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Event creation error:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to create event. Please try again.';
        alert(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json() as { event?: EventItem; eventId?: string; slug?: string };
      
      if (!data.eventId || !data.slug || !data.event) {
        throw new Error('Event creation failed - missing data');
      }
      
      if (onCreated) {
        // Pass the full event so Dashboard can add it to state immediately
        onCreated(data.event, data.eventId, data.slug);
      }
      
      // Close wizard and return to overview
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateEvent();
  };

  return (
    <section className="space-y-6" role="main" aria-labelledby="wizard-heading">
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <h1 id="wizard-heading" className="text-2xl font-bold text-slate-900">
          Create New Event
        </h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close wizard"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Event Basics */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Event Basics
                </h2>
                <div>
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    placeholder="e.g., Summer Wedding Reception"
                    className="text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="eventTypeRaw">Event Type *</Label>
                  <Input
                    id="eventTypeRaw"
                    value={formData.eventTypeRaw}
                    onChange={(e) => updateField('eventTypeRaw', e.target.value)}
                    required
                    placeholder="e.g., black-tie gala, church wedding, company retreat"
                    className="text-slate-900"
                    aria-describedby="eventTypeHelp"
                  />
                  <p id="eventTypeHelp" className="mt-1 text-xs text-slate-500">
                    Type anything (e.g., “black-tie gala”, “church wedding”, “company retreat”).
                  </p>
                </div>
              </div>

              {/* Date &amp; Location */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Date &amp; Location
                </h2>
                <div>
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    required
                    className="text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      required
                      placeholder="New York"
                      className="text-slate-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value.toUpperCase())}
                      required
                      placeholder="NY"
                      maxLength={2}
                      className="text-slate-900 uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Zip Code *</Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => updateField('zipCode', e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="10001"
                      maxLength={5}
                      className="text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="venue">Venue (Optional)</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => updateField('venue', e.target.value)}
                    placeholder="e.g., Grand Ballroom, Central Park, etc."
                    className="text-slate-900"
                  />
                </div>
              </div>

              {/* Scale &amp; Budget */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" /> Scale &amp; Budget
                </h2>
                <div>
                  <Label htmlFor="headcount">Expected Headcount *</Label>
                  <Input
                    id="headcount"
                    type="number"
                    value={formData.headcount}
                    onChange={(e) => updateField('headcount', e.target.value)}
                    required
                    placeholder="e.g., 150"
                    min="1"
                    className="text-slate-900"
                  />
                </div>
                <div>
                  <Label htmlFor="budgetRaw">Budget *</Label>
                  <Input
                    id="budgetRaw"
                    value={formData.budgetRaw}
                    onChange={(e) => updateField('budgetRaw', e.target.value)}
                    required
                    placeholder="e.g., $12,500, 10k-15k, under 5k, about 30k EUR"
                    className="text-slate-900"
                    aria-describedby="budgetHelp"
                  />
                  <p id="budgetHelp" className="mt-1 text-xs text-slate-500">
                    Type any format: “$12,500”, “10k–15k”, “under 5k”, “about 30k EUR”.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Objective */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5" /> Objective
                </h2>
                <div>
                  <Label htmlFor="objective">What’s the main goal of this event? (Optional)</Label>
                  <textarea
                    id="objective"
                    value={formData.objective}
                    onChange={(e) => updateField('objective', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                    placeholder="Describe what you want to achieve with this event..."
                  />
                </div>
              </div>

              {/* Style */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Style &amp; Theme
                </h2>
                <div>
                  <Label htmlFor="style">Event Style &amp; Theme *</Label>
                  <textarea
                    id="style"
                    value={formData.style}
                    onChange={(e) => updateField('style', e.target.value)}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                    placeholder="Describe the style, theme, atmosphere you want (e.g., elegant, casual, modern, rustic)..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Preview Box */}
          <div className="mt-8 p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-900 mb-2">
              <strong>✨ AI will automatically:</strong>
            </p>
            <ul className="text-sm text-indigo-800 list-disc list-inside space-y-1">
              <li>Draft an event brief</li>
              <li>Search for matching vendors and venues</li>
              <li>Establish a budget with contingency</li>
              <li>Auto-allocate line items with targets and buffers</li>
              <li>Create initial checklist and milestones</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="px-8 py-2">
              {loading ? 'Creating Event…' : 'Create Event'}
            </Button>
          </div>
        </Card>
      </form>
    </section>
  );
}

