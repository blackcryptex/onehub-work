'use client';

import { Plus, Calendar, Users, DollarSign, CheckCircle } from 'lucide-react';

type Props = {
  onCreateEvent: () => void;
};

export function EmptyStateOnboarding({ onCreateEvent }: Props) {
  const steps = [
    {
      icon: Plus,
      title: 'Create Your First Event',
      description: 'Set up your event with name, date, and location.',
    },
    {
      icon: Calendar,
      title: 'Plan Your Timeline',
      description: 'Add tasks and milestones to keep everything on track.',
    },
    {
      icon: Users,
      title: 'Invite Guests',
      description: 'Build your guest list and manage RSVPs.',
    },
    {
      icon: DollarSign,
      title: 'Set Your Budget',
      description: 'Track expenses and stay within your budget.',
    },
  ];
  
  return (
    <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Get Started with OneHub</h2>
        <p className="text-slate-600 mb-8">
          Plan your event from start to finish with AI-powered tools and comprehensive management.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <button
          onClick={onCreateEvent}
          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Create your first event"
        >
          Create Event
        </button>
      </div>
    </div>
  );
}

