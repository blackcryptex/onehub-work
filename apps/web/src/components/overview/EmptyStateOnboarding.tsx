'use client';

import { Plus, Calendar, Users, DollarSign, CheckCircle, Sparkles } from 'lucide-react';

type Props = {
  onCreateEvent: () => void;
  title?: string;
  description?: string;
  ctaLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function EmptyStateOnboarding({
  onCreateEvent,
  title = 'Welcome to your planning hub',
  description = 'Start with one event and OneHub will scaffold your budget, checklist, and next steps so you are never staring at a blank screen.',
  ctaLabel = 'Create my first event',
  secondaryActionLabel,
  onSecondaryAction,
}: Props) {
  const steps = [
    {
      icon: Plus,
      title: 'Create your event',
      description: 'Name it, pick the date, and tell OneHub what you are planning.',
    },
    {
      icon: Calendar,
      title: 'Get an instant plan',
      description: 'We seed your checklist, milestones, and timeline from the basics.',
    },
    {
      icon: DollarSign,
      title: 'Start with a budget',
      description: 'Your event opens with starter budget lines so you can refine instead of building from zero.',
    },
    {
      icon: Users,
      title: 'Invite people later',
      description: 'Add guests, collaborators, and vendors when you are ready.',
    },
  ];

  return (
    <div className="rounded-2xl bg-[color:var(--oh-surface)] shadow-sm p-8 text-center">
      <div className="max-w-3xl mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-indigo-600" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-6 max-w-2xl mx-auto">{description}</p>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900 mb-8 flex items-start gap-3 text-left">
          <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-600" aria-hidden="true" />
          <div>
            <div className="font-semibold">Quick start</div>
            <p className="text-indigo-800/90">
              The first event wizard now drops you straight into your vault with seeded planning data, so the fastest path is simply to create the event and keep refining from there.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/80 p-4">
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

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onCreateEvent}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label={ctaLabel}
          >
            {ctaLabel}
          </button>
          {secondaryActionLabel && onSecondaryAction ? (
            <button
              onClick={onSecondaryAction}
              className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 transition-colors"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
