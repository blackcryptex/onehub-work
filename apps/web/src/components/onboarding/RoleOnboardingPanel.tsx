"use client";

import React from "react";

import { recordLocalOnboardingCompletion } from "@/lib/onboarding-completion";
import { getRoleOnboarding, type Gate3COnboardingRole } from "@/lib/role-onboarding";

export function RoleOnboardingPanel({
  role,
  source = "dashboard",
}: {
  role: Gate3COnboardingRole;
  source?: "dashboard" | "client-portal" | "admin-overview" | "manual";
}) {
  const onboarding = getRoleOnboarding(role);
  const [completed, setCompleted] = React.useState(false);

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 shadow-sm"
      aria-labelledby={`role-onboarding-${role}`}
      data-role-onboarding={role}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {onboarding.label} onboarding
          </p>
          <h2 id={`role-onboarding-${role}`} className="text-xl font-semibold text-slate-950">
            {onboarding.headline}
          </h2>
          <p className="max-w-3xl text-sm text-slate-700">{onboarding.summary}</p>
          <p className="max-w-3xl text-sm font-medium text-indigo-900" title={onboarding.help}>
            First trust-engine action: {onboarding.firstTrustAction}
          </p>
          <p className="max-w-3xl text-xs text-slate-600">{onboarding.visibilityNote}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            recordLocalOnboardingCompletion(role, {
              completedChecklistItems: onboarding.checklist,
              source,
            });
            setCompleted(true);
          }}
          className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-800 shadow-sm hover:bg-indigo-100"
          aria-pressed={completed}
        >
          {completed ? "Onboarding noted locally" : "Mark onboarding reviewed"}
        </button>
      </div>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {onboarding.checklist.map((item, index) => (
          <li key={item} className="rounded-xl bg-white/80 p-3 text-sm text-slate-700 shadow-sm">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}
