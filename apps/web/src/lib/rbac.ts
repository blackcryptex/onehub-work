import type { Role, RoleUserLike } from "@onehub/types/src/roles";
import { hasRole, requireRole } from "@onehub/types/src/roles";
import type { AppUser } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type { Role };

/**
 * Re-exported role checks for convenience in app layer.
 */
export { hasRole, requireRole, isAdmin };

export const GUARDED_MVP_PLATFORM_ADMIN_AUTHORITY = "PLATFORM_ADMIN";

export function isPlatformAdminForGuardedMvp(user: AppUser | null | undefined): boolean {
  if (!user || !isAdmin(user)) return false;

  const configuredIds = (process.env.GUARDED_MVP_PLATFORM_ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configuredIds.includes(user.id);
}

export async function getGuardedMvpAuthorityForUserId(userId: string | null | undefined) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return null;
  return isPlatformAdminForGuardedMvp(user) ? user : null;
}

export function assertPlatformAdminForGuardedMvp(user: AppUser | null | undefined) {
  if (isPlatformAdminForGuardedMvp(user)) return;
  const err = new Error("Forbidden");
  // @ts-expect-error add status on the fly
  err.status = 403;
  throw err;
}

/**
 * Asserts access and throws 403 error if missing.
 */
export function assertRole(user: RoleUserLike | null | undefined, roles: Role[]) {
  const roleChecker = requireRole(roles);
  const ok = roleChecker(user);
  if (!ok) {
    const err = new Error("Forbidden");
    // @ts-expect-error add status on the fly
    err.status = 403;
    throw err;
  }
}

/**
 * Types for RBAC helpers - minimal interfaces matching what we actually access
 */
interface OrgLike {
  ownerId: string;
  members?: Array<{ userId: string; role?: string }>;
}

interface EventStakeholderLike {
  userId: string;
  role: "CLIENT" | "STAKEHOLDER";
}

interface EventShareLike {
  viewerUserId: string;
  scope: "SUMMARY";
}

interface EventLike {
  orgId: string;
  createdById: string; // Required: always present in Prisma Event model
  org?: OrgLike;
  stakeholders?: EventStakeholderLike[]; // Phase 1: Event-scoped stakeholders
  shares?: EventShareLike[]; // Phase 2: Explicit sharing/forwarding
}

interface MembershipLike {
  userId: string;
  role?: string;
}

interface ClientLike {
  id: string;
  ownerId?: string;
  orgId?: string;
  org?: OrgLike;
}

interface ListingLike {
  orgId: string;
  org?: OrgLike;
}

/**
 * Returns true if the user is the owner of the org.
 */
export function isOrgOwner(user: AppUser | null | undefined, org: OrgLike | null | undefined): boolean {
  if (!user || !org) return false;
  return org.ownerId === user.id;
}

/**
 * Returns true if the user is a member of the org.
 * Checks both direct membership and ownership.
 */
export function isOrgMember(user: AppUser | null | undefined, org: OrgLike | null | undefined): boolean {
  if (!user || !org) return false;
  // Owner is always a member
  if (isOrgOwner(user, org)) return true;
  // Check explicit membership
  if (org.members && org.members.some((m) => m.userId === user.id)) return true;
  return false;
}

/**
 * Returns true if the user can manage the event.
 * True if:
 * - user is ADMIN, or
 * - user is org owner of the event's org, or
 * - Planner (DIY/PRO): can only manage events they created (isEventOwnedByPlanner)
 * - Other org members: can manage events in their org (non-planner members)
 * 
 * Note: This function maintains backward compatibility for non-planner org members
 * while enforcing planner isolation for DIY_PLANNER and PRO_PLANNER.
 */
export function canManageEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can manage all events
  if (isAdmin(user)) return true;
  // Need org info to check ownership/membership
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can manage all events in their org
  if (isOrgOwner(user, org)) return true;
  // Planner isolation: planners can only manage events they created
  if (isPlanner(user)) {
    return isEventOwnedByPlanner(user, event);
  }
  // Other org members (non-planners) can manage events in their org
  return isOrgMember(user, org);
}

/**
 * Returns true if the user is an org admin or owner.
 * Checks both the user's global role and their org role.
 */
export function isOrgAdminOrOwner(
  user: AppUser | null | undefined,
  org: OrgLike | null | undefined,
  membership?: MembershipLike | null
): boolean {
  if (!user || !org) return false;
  // Global admin can do anything
  if (isAdmin(user)) return true;
  // Org owner
  if (isOrgOwner(user, org)) return true;
  // Check membership role if provided
  if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
    return true;
  }
  return false;
}

// canViewEvent is now defined below with planner isolation

/**
 * Returns true if the user can view the event budget.
 * True if:
 * - user is ADMIN, OR
 * - user is the org owner of the event's org, OR
 * - user is an org member with a planner role (DIY_PLANNER or PRO_PLANNER) associated with that event.
 * 
 * Assumption: event.orgId is populated and org.members includes all planners/vendors for this event.
 * Vendors/venues cannot view budgets by default unless they are org members with planner roles.
 */
export function canViewBudget(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can view all budgets
  if (isAdmin(user)) return true;
  
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can view budget
  if (isOrgOwner(user, org)) return true;
  
  // Check if user is a planner (DIY_PLANNER or PRO_PLANNER) who is an org member
  const isPlanner = user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
  if (isPlanner && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can edit the event budget.
 * True if:
 * - user is ADMIN, OR
 * - user is org owner, OR
 * - user is a PRO_PLANNER (and optionally DIY_PLANNER) assigned to that event.
 * 
 * Assumption: event.orgId is populated and org.members includes all planners for this event.
 */
export function canEditBudget(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can edit all budgets
  if (isAdmin(user)) return true;
  
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can edit budget
  if (isOrgOwner(user, org)) return true;
  
  // Only PRO_PLANNER can edit budgets (DIY_PLANNER can view but not edit)
  if (user.role === "PRO_PLANNER" && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can view proposals for an event.
 * True if:
 * - user is ADMIN, OR
 * - user is org owner, OR
 * - user is a planner (DIY_PLANNER or PRO_PLANNER) who is an org member.
 * 
 * Vendors/venues can see proposals addressed to them, but this is handled separately
 * via proposal-specific checks (e.g., checking if proposal.listingId matches vendor's listing).
 */
export function canViewProposals(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can view all proposals
  if (isAdmin(user)) return true;
  
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can view proposals
  if (isOrgOwner(user, org)) return true;
  
  // Planners who are org members can view proposals
  const isPlanner = user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
  if (isPlanner && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can send proposals for an event.
 * True if:
 * - user is ADMIN, OR
 * - user is org owner, OR
 * - user is a PRO_PLANNER who is an org member.
 * 
 * Vendors/venues can send proposals, but this is typically handled via listing ownership
 * rather than event-level permissions.
 */
export function canSendProposal(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  // Admin can send proposals
  if (isAdmin(user)) return true;
  
  const org = event.org || { ownerId: "", members: [] };
  // Org owner can send proposals
  if (isOrgOwner(user, org)) return true;
  
  // Only PRO_PLANNER can send proposals (DIY_PLANNER cannot)
  if (user.role === "PRO_PLANNER" && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can release milestone payments in guarded MVP.
 * Only a canonical PLATFORM_ADMIN authority holder may release funds.
 */
export function canReleaseMilestonePayment(user: AppUser | null | undefined, _event: EventLike | null | undefined): boolean {
  return isPlatformAdminForGuardedMvp(user);
}

/**
 * Returns true if the user can mark a milestone as complete.
 * True if:
 * - user is ADMIN, OR
 * - user is org owner of the event's org, OR
 * - user is a PRO_PLANNER who is an org member, OR
 * - user is the seller (vendor) associated with the milestone's contract.
 * 
 * Note: Sellers can mark their own milestones complete, but cannot release payments.
 * 
 * Assumption: event.orgId is populated and org.members includes all planners for this event.
 */
export function canMarkMilestoneComplete(
  user: AppUser | null | undefined,
  event: EventLike | null | undefined,
  isSeller?: boolean
): boolean {
  if (!user || !event) return false;
  // Sellers can mark their own milestones complete
  if (isSeller) return true;
  
  // Admin, org owner, or PRO_PLANNER can mark complete
  return canReleaseMilestonePayment(user, event);
}

/**
 * Returns true if the user is a planner (DIY_PLANNER or PRO_PLANNER).
 */
export function isPlanner(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
}

/**
 * Returns true if the event is owned by this specific planner.
 * An event is "owned" by a planner if they created it (event.createdById === user.id).
 * 
 * Assumption: event.createdById indicates the planner who owns/manages the event.
 * This ensures planner isolation - DIY_PLANNER and PRO_PLANNER cannot see each other's events.
 */
export function isEventOwnedByPlanner(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  if (!isPlanner(user)) return false;
  // Event is owned by planner if they created it
  return event.createdById === user.id;
}

/**
 * Returns true if the client (organization) is owned by this planner.
 * A client org is "owned" by a planner if:
 * - The planner is the org owner (org.ownerId === user.id), OR
 * - The planner created events for this org (we check via event.createdById in practice).
 * 
 * For now, we use org.ownerId as the primary indicator of ownership.
 * Assumption: CLIENT_AGENCY organizations are managed by planners who own them.
 */
export function isClientOwnedByPlanner(user: AppUser | null | undefined, client: ClientLike | null | undefined): boolean {
  if (!user || !client) return false;
  if (!isPlanner(user)) return false;
  // Client is owned by planner if planner is the org owner
  if (client.ownerId === user.id) return true;
  // Also check if planner owns the org via org relation
  if (client.org && client.org.ownerId === user.id) return true;
  return false;
}

/**
 * Phase 2: Returns true if the event content is shared with the user for the given scope.
 * Clients can only view content explicitly shared by the Pro Planner.
 */
export function isEventSharedWithUser(
  user: AppUser | null | undefined,
  event: EventLike | null | undefined,
  scope: "SUMMARY" = "SUMMARY"
): boolean {
  if (!user || !event || !event.shares) return false;
  return event.shares.some((share) => share.viewerUserId === user.id && share.scope === scope);
}

/**
 * Returns true if the user can view the event.
 * Rules:
 * - ADMIN: can view all events
 * - Org owner: can view all events in their org
 * - Planner (DIY/PRO): can only view events they created (isEventOwnedByPlanner)
 * - CLIENT: can view events where they are an EventStakeholder AND content is shared (Phase 1 + Phase 2)
 * - Vendors/Venues: cannot view planner events (no extra rights here)
 */
export function canViewEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  
  // Admin can view all events
  if (isAdmin(user)) return true;
  
  // Org owner can view all events in their org
  const org = event.org || { ownerId: "", members: [] };
  if (isOrgOwner(user, org)) return true;
  
  // Planner isolation: planners can only view events they created
  if (isPlanner(user)) {
    return isEventOwnedByPlanner(user, event);
  }
  
  // Phase 1 + Phase 2: CLIENT users can view events where:
  // 1. They are an EventStakeholder (Phase 1)
  // 2. Content is explicitly shared with them (Phase 2)
  if (user.role === "CLIENT") {
    // Must be a stakeholder
    const isStakeholder = event.stakeholders && event.stakeholders.some((s) => s.userId === user.id);
    if (!isStakeholder) return false;
    
    // Content must be shared (Phase 2)
    return isEventSharedWithUser(user, event, "SUMMARY");
  }
  
  // Vendors/Venues and others: no access by default
  return false;
}

/**
 * Returns true if the user can edit the event.
 * Rules:
 * - ADMIN: can edit all events
 * - Org owner: can edit all events in their org
 * - Planner (DIY/PRO): can only edit events they created (isEventOwnedByPlanner)
 * - Vendors/Venues: cannot edit planner events
 */
export function canEditEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  if (!user || !event) return false;
  
  // Admin can edit all events
  if (isAdmin(user)) return true;
  
  // Org owner can edit all events in their org
  const org = event.org || { ownerId: "", members: [] };
  if (isOrgOwner(user, org)) return true;
  
  // Planner isolation: planners can only edit events they created
  if (isPlanner(user)) {
    return isEventOwnedByPlanner(user, event);
  }
  
  // Vendors/Venues and others: no access by default
  return false;
}

/**
 * Returns true if the user can delete the event.
 * Rules:
 * - ADMIN: can delete all events
 * - Org owner: can delete all events in their org
 * - Planner (DIY/PRO): can only delete events they created (isEventOwnedByPlanner)
 * - Vendors/Venues: cannot delete planner events
 */
export function canDeleteEvent(user: AppUser | null | undefined, event: EventLike | null | undefined): boolean {
  // Same rules as canEditEvent
  return canEditEvent(user, event);
}

/**
 * Returns true if the user can view the client (organization).
 * Rules:
 * - ADMIN: can view all clients
 * - Org owner: can view their own org
 * - Planner (DIY/PRO): can only view clients they own (isClientOwnedByPlanner)
 */
export function canViewClient(user: AppUser | null | undefined, client: ClientLike | null | undefined): boolean {
  if (!user || !client) return false;
  
  // Admin can view all clients
  if (isAdmin(user)) return true;
  
  // Org owner can view their own org
  if (client.ownerId === user.id) return true;
  if (client.org && client.org.ownerId === user.id) return true;
  
  // Planner isolation: planners can only view clients they own
  if (isPlanner(user)) {
    return isClientOwnedByPlanner(user, client);
  }
  
  return false;
}

/**
 * Returns true if the user can edit the client (organization).
 * Rules:
 * - ADMIN: can edit all clients
 * - Org owner: can edit their own org
 * - Planner (DIY/PRO): can only edit clients they own (isClientOwnedByPlanner)
 */
export function canEditClient(user: AppUser | null | undefined, client: ClientLike | null | undefined): boolean {
  // Same rules as canViewClient
  return canViewClient(user, client);
}

/**
 * Returns true if the user can delete the client (organization).
 * Rules:
 * - ADMIN: can delete all clients
 * - Org owner: can delete their own org
 * - Planner (DIY/PRO): can only delete clients they own (isClientOwnedByPlanner)
 */
export function canDeleteClient(user: AppUser | null | undefined, client: ClientLike | null | undefined): boolean {
  // Same rules as canEditClient
  return canEditClient(user, client);
}

/**
 * Returns true if the user can edit a vendor/venue organization profile.
 * Rules:
 * - ADMIN: can edit all vendor/venue orgs
 * - Org owner/admin: can edit their org
 * - Vendor/Venue members: can edit their own org (if they are members)
 */
export function canEditVendorOrgProfile(
  user: AppUser | null | undefined,
  org: OrgLike | null | undefined,
  membership?: MembershipLike | null
): boolean {
  if (!user || !org) return false;
  
  // Admin can edit all orgs
  if (isAdmin(user)) return true;
  
  // Org owner/admin can edit
  if (isOrgAdminOrOwner(user, org, membership)) return true;
  
  // Vendor/Venue members can edit their own org
  const isVendorOrVenue = user.role === "VENDOR" || user.role === "VENUE";
  if (isVendorOrVenue && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can edit a listing.
 * Rules:
 * - ADMIN: can edit all listings
 * - Org owner/admin: can edit listings in their org
 * - Vendor/Venue members: can edit listings in their own org
 */
export function canEditListing(user: AppUser | null | undefined, listing: ListingLike | null | undefined): boolean {
  if (!user || !listing) return false;
  
  // Admin can edit all listings
  if (isAdmin(user)) return true;
  
  // Need org info to check ownership/membership
  const org = listing.org || { ownerId: "", members: [] };
  
  // Org owner/admin can edit
  const mem = org.members?.find((m) => m.userId === user.id);
  if (isOrgAdminOrOwner(user, org, mem)) return true;
  
  // Vendor/Venue members can edit listings in their own org
  const isVendorOrVenue = user.role === "VENDOR" || user.role === "VENUE";
  if (isVendorOrVenue && isOrgMember(user, org)) {
    return true;
  }
  
  return false;
}

/**
 * Returns true if the user can access the specified dashboard.
 * Each dashboard is accessible to users with the matching role, plus admins.
 * ADMIN dashboard is only accessible to admins.
 */
export function canAccessDashboard(
  user: AppUser | null | undefined,
  dashboardKey: "DIY_PLANNER" | "PRO_PLANNER" | "VENDOR" | "VENUE" | "EVENT_DREAMER" | "ADMIN"
): boolean {
  if (!user) return false;
  
  // Admin dashboard: only admins
  if (dashboardKey === "ADMIN") {
    return isAdmin(user);
  }
  
  // Other dashboards: matching role OR admin
  return user.role === dashboardKey || isAdmin(user);
}

/**
 * Blocks CLIENT users from accessing planner-only routes.
 * Throws an error that can be caught by Next.js error handling or redirects.
 * 
 * Use this in server components and API routes to prevent CLIENT access.
 * 
 * @param user - The current user
 * @param redirectTo - Optional redirect path (default: "/app")
 * @throws Error with status 403 if user is CLIENT
 */
export function blockClientAccess(
  user: AppUser | null | undefined,
  redirectTo: string = "/app"
): void {
  if (!user) {
    const err = new Error("Unauthorized");
    // @ts-expect-error add status on the fly
    err.status = 401;
    throw err;
  }
  
  // Block CLIENT users from planner-only routes
  if (user.role === "CLIENT") {
    const err = new Error("Forbidden: CLIENT users cannot access planner routes");
    // @ts-expect-error add status on the fly
    err.status = 403;
    throw err;
  }
}

/**
 * Returns true if the user is a planner (DIY_PLANNER or PRO_PLANNER).
 * Used to check if user should have access to planner-only features.
 */
export function isPlannerRole(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "DIY_PLANNER" || user.role === "PRO_PLANNER";
}

/**
 * Phase 7A: Returns true if the client can create a deposit for the event.
 * Rules:
 * - User must be CLIENT role
 * - User must be an EventStakeholder for the event
 * - Event must have SUMMARY shared with the user (or payment enabled condition)
 */
export function canCreateDeposit(
  user: AppUser | null | undefined,
  event: EventLike | null | undefined
): boolean {
  if (!user || !event) return false;
  
  // Only CLIENT users can create deposits
  if (user.role !== "CLIENT") return false;
  
  // Must be a stakeholder
  const isStakeholder = event.stakeholders && event.stakeholders.some((s) => s.userId === user.id);
  if (!isStakeholder) return false;
  
  // Content must be shared (SUMMARY minimum) OR we allow deposits even without share
  // For Phase 7A, we allow deposits if stakeholder relationship exists
  // This gives flexibility - planner can enable payments without sharing full content
  return isEventSharedWithUser(user, event, "SUMMARY") || isStakeholder;
}
