'use client';

import { AlertTriangle, Info, XCircle } from 'lucide-react';
import type { NavigateToTab } from '@/lib/overview.links';

type Alert = {
  severity: 'info' | 'warn' | 'error';
  message: string;
  cta?: { label: string; href: string; tab?: string; eventId?: string };
};

type Props = {
  alerts: Alert[];
  onNavigateToTab?: NavigateToTab;
};

export function PriorityAlerts({ alerts, onNavigateToTab }: Props) {
  if (alerts.length === 0) {
    return null;
  }
  
  const severityConfig = {
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    warn: {
      icon: AlertTriangle,
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700',
    },
  };
  
  return (
    <div className="space-y-3">
      {alerts.map((alert, idx) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        
        const handleCtaClick = () => {
          if (alert.cta && alert.cta.eventId && alert.cta.tab && onNavigateToTab) {
            onNavigateToTab(alert.cta.eventId, alert.cta.tab);
          }
        };
        
        return (
          <div
            key={idx}
            className={`rounded-xl border p-4 ${config.bg} ${config.border}`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} aria-hidden="true" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${config.text}`}>{alert.message}</p>
                {alert.cta && (
                  <button
                    onClick={handleCtaClick}
                    className={`mt-2 px-3 py-1.5 text-xs font-semibold text-white rounded-lg ${config.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    aria-label={alert.cta.label}
                  >
                    {alert.cta.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

