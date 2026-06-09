import type { Role } from "@onehub/types/src/roles";

export type PublicSignupRole = "DIY_PLANNER" | "PRO_PLANNER" | "VENDOR" | "VENUE";

type OrgType = "PLANNER" | "VENDOR" | "VENUE" | "CLIENT_AGENCY";

export const PUBLIC_SIGNUP_ROLES: PublicSignupRole[] = ["DIY_PLANNER", "PRO_PLANNER", "VENDOR", "VENUE"];

export const SIGNUP_ROLE_OPTIONS: Array<{
  role: PublicSignupRole;
  label: string;
  description: string;
}> = [
  {
    role: "DIY_PLANNER",
    label: "DIY Planner",
    description: "Plan and manage your own event directly.",
  },
  {
    role: "PRO_PLANNER",
    label: "Pro Planner",
    description: "Run a planning business and coordinate client events.",
  },
  {
    role: "VENDOR",
    label: "Vendor",
    description: "Offer event services such as catering, music, décor, or photography.",
  },
  {
    role: "VENUE",
    label: "Venue",
    description: "List and manage an event space for booking requests.",
  },
];

const ROLE_DENIAL_MESSAGES: Record<string, string> = {
  ADMIN: "Admin accounts are provisioned manually by OneHub operations.",
  CLIENT: "Client access is invite-only for MVP and must be event-linked.",
  EVENT_DREAMER: "Event Dreamer is an MVP feature path, not a public signup role.",
};

export function isPublicSignupRole(role: unknown): role is PublicSignupRole {
  return typeof role === "string" && PUBLIC_SIGNUP_ROLES.includes(role as PublicSignupRole);
}

export function validatePublicSignupRole(
  role: unknown
): { ok: true; role: PublicSignupRole } | { ok: false; error: string } {
  if (role === undefined || role === null || role === "") {
    return { ok: false, error: "Choose a public signup role to continue." };
  }

  if (typeof role !== "string") {
    return { ok: false, error: "Choose a valid public signup role to continue." };
  }

  if (isPublicSignupRole(role)) {
    return { ok: true, role };
  }

  return {
    ok: false,
    error: ROLE_DENIAL_MESSAGES[role] || "Choose a valid public signup role to continue.",
  };
}

export function getInitialSignupRole(role: unknown): PublicSignupRole | "" {
  return isPublicSignupRole(role) ? role : "";
}

export function getRoleForCreatedOrg(orgType: OrgType, currentRole?: Role | null): Role | null {
  if (orgType !== "PLANNER") return null;
  if (currentRole === "PRO_PLANNER" || currentRole === "ADMIN") return null;
  return "PRO_PLANNER";
}
