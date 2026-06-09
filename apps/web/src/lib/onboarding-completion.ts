import type { Gate3COnboardingRole } from "./role-onboarding";
import { getRoleOnboarding } from "./role-onboarding";

export const ONBOARDING_COMPLETION_EVENT_NAME = "onehub.gate3c.onboarding.completed";

type OnboardingCompletionInput = {
  userId?: string | null;
  completedChecklistItems?: string[];
  source?: "dashboard" | "client-portal" | "admin-overview" | "manual";
};

export type OnboardingCompletionEvent = {
  eventName: typeof ONBOARDING_COMPLETION_EVENT_NAME;
  role: Gate3COnboardingRole;
  completionKey: `gate3c:onboarding:${Gate3COnboardingRole}`;
  completedChecklistItems: string[];
  source: NonNullable<OnboardingCompletionInput["source"]>;
  userHash?: string;
};

function localHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
}

export function buildOnboardingCompletionEvent(
  role: Gate3COnboardingRole,
  input: OnboardingCompletionInput = {}
): OnboardingCompletionEvent {
  const onboarding = getRoleOnboarding(role);
  return {
    eventName: ONBOARDING_COMPLETION_EVENT_NAME,
    role,
    completionKey: onboarding.completionKey,
    completedChecklistItems: input.completedChecklistItems ?? onboarding.checklist,
    source: input.source ?? "dashboard",
    ...(input.userId ? { userHash: `local_${localHash(input.userId)}` } : {}),
  };
}

export function recordLocalOnboardingCompletion(
  role: Gate3COnboardingRole,
  input: OnboardingCompletionInput = {}
): OnboardingCompletionEvent {
  const event = buildOnboardingCompletionEvent(role, input);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(event.completionKey, JSON.stringify(event));
  } else if (process.env.NODE_ENV !== "test") {
    console.info("[onehub:onboarding-completion]", event);
  }

  return event;
}
