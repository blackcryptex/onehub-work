import type { Role } from "@onehub/types/src/roles";

export type Gate3COnboardingRole = "DIY_PLANNER" | "PRO_PLANNER" | "VENDOR" | "VENUE" | "CLIENT" | "ADMIN";

export type RoleOnboardingContent = {
  role: Gate3COnboardingRole;
  label: string;
  headline: string;
  summary: string;
  checklist: string[];
  firstTrustAction: string;
  help: string;
  visibilityNote: string;
  completionKey: `gate3c:onboarding:${Gate3COnboardingRole}`;
};

export const GATE3C_MVP_ONBOARDING_ROLES: Gate3COnboardingRole[] = [
  "DIY_PLANNER",
  "PRO_PLANNER",
  "VENDOR",
  "VENUE",
  "CLIENT",
  "ADMIN",
];

export const ROLE_ONBOARDING: Record<Gate3COnboardingRole, RoleOnboardingContent> = {
  DIY_PLANNER: {
    role: "DIY_PLANNER",
    label: "DIY Planner",
    headline: "Build the event truth first",
    summary:
      "Set up your own event workspace so OneHub can track budget, guests, vendors, proposals, contracts, and milestones from one trusted source.",
    checklist: [
      "Create the event with date, location, guest count, and budget basics.",
      "Add early vendor or venue needs so requests and proposals stay tied to the event.",
      "Use the vault checklist to keep guests, budget, contracts, and milestones synchronized.",
    ],
    firstTrustAction: "Create your first event",
    help: "Start with: Create your first event. This is the first trust-engine action because every vendor, venue, proposal, payment, and milestone needs a verified event context.",
    visibilityNote: "DIY Planner is one of the four public MVP signup roles.",
    completionKey: "gate3c:onboarding:DIY_PLANNER",
  },
  PRO_PLANNER: {
    role: "PRO_PLANNER",
    label: "Pro Planner",
    headline: "Separate every client event cleanly",
    summary:
      "Use your planner workspace to manage client events, invitations, provider coordination, approvals, contracts, and milestone payments without mixing client contexts.",
    checklist: [
      "Confirm your planning organization profile and service area.",
      "Create or open a client event before inviting clients or sourcing providers.",
      "Keep client-facing approvals, vendor proposals, and payment milestones attached to the right event.",
    ],
    firstTrustAction: "Create or manage a client event",
    help: "Start with: Create or manage a client event. This is the first trust-engine action because delegated planning authority must be scoped to a client/event before invitations or provider commitments.",
    visibilityNote: "Pro Planner is one of the four public MVP signup roles.",
    completionKey: "gate3c:onboarding:PRO_PLANNER",
  },
  VENDOR: {
    role: "VENDOR",
    label: "Vendor",
    headline: "Publish a bookable service profile",
    summary:
      "Complete the provider profile that planners and event owners use to evaluate services, request quotes, sign contracts, and track fulfillment milestones.",
    checklist: [
      "Complete business details, categories, service area, and contact-safe listing copy.",
      "Add packages, photos, availability, and pricing guidance before responding to leads.",
      "Use proposals, contracts, and milestone payments for every accepted booking.",
    ],
    firstTrustAction: "Complete and publish your vendor profile",
    help: "Start with: Complete and publish your vendor profile. This is the first trust-engine action because booking requests and proposal trust depend on a verified service listing.",
    visibilityNote: "Vendor is one of the four public MVP signup roles.",
    completionKey: "gate3c:onboarding:VENDOR",
  },
  VENUE: {
    role: "VENUE",
    label: "Venue",
    headline: "Publish a venue listing with booking terms",
    summary:
      "Build a venue listing that captures capacity, availability, rental terms, photos, and booking constraints before planners or event owners request space.",
    checklist: [
      "Complete venue spaces, address/service area, capacity, availability, and restrictions.",
      "Add photos, rates, blackout dates, and event-type fit before accepting leads.",
      "Keep proposals, contracts, deposits, and milestone terms attached to each venue request.",
    ],
    firstTrustAction: "Complete and publish your venue listing",
    help: "Start with: Complete and publish your venue listing. This is the first trust-engine action because space bookings need capacity, availability, and policy truth before proposals or payments.",
    visibilityNote: "Venue is one of the four public MVP signup roles.",
    completionKey: "gate3c:onboarding:VENUE",
  },
  CLIENT: {
    role: "CLIENT",
    label: "Client",
    headline: "Review only the event context shared with you",
    summary:
      "Client access is scoped to planner invitations or event-linked shares. Use the client portal to review approved event details, vendors, planner updates, approvals, and payments.",
    checklist: [
      "Open the planner invitation or event-linked share that granted access.",
      "Review event summary, selected vendors/venue, proposal context, and planner notes.",
      "Take only the approval, message, or payment action exposed for that shared event.",
    ],
    firstTrustAction: "Review your shared event context",
    help: "Start with: Review your shared event context. This is the first trust-engine action because client authority is event-linked, not a broad public planner signup.",
    visibilityNote: "Client is invite/event-linked for MVP and is not a public self-service signup role.",
    completionKey: "gate3c:onboarding:CLIENT",
  },
  ADMIN: {
    role: "ADMIN",
    label: "Admin",
    headline: "Operate trust oversight from guarded queues",
    summary:
      "Admin access is manual/internal only. Use admin surfaces for verification, abuse, disputes, payout holdbacks, refunds, and intervention with auditability.",
    checklist: [
      "Enter through the guarded admin overview, never public signup.",
      "Review verification, abuse, dispute, refund, payout, and holdback queues before intervening.",
      "Use documented admin controls for oversight actions instead of impersonation or direct data mutation.",
    ],
    firstTrustAction: "Review trust oversight queues",
    help: "Start with: Review trust oversight queues. This is the first trust-engine action because admin intervention must begin from auditable oversight context.",
    visibilityNote: "Admin is manual/internal provisioning only and is never exposed as public signup.",
    completionKey: "gate3c:onboarding:ADMIN",
  },
};

export function isGate3COnboardingRole(role: Role | string | null | undefined): role is Gate3COnboardingRole {
  return typeof role === "string" && GATE3C_MVP_ONBOARDING_ROLES.includes(role as Gate3COnboardingRole);
}

export function getRoleOnboarding(role: Gate3COnboardingRole): RoleOnboardingContent {
  return ROLE_ONBOARDING[role];
}

export function roleOnboardingItems(): RoleOnboardingContent[] {
  return GATE3C_MVP_ONBOARDING_ROLES.map((role) => ROLE_ONBOARDING[role]);
}
