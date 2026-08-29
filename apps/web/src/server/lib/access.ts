import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import type { AppUser } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/auth-helpers";
import { canManageEvent, canViewEvent, isOrgMember } from "@/lib/rbac";

/**
 * Shared resource-level authorization helpers for tRPC routers.
 *
 * `protectedProcedure` (apps/web/src/server/trpc.ts) only guarantees
 * authentication. Every resolver that touches tenant data must also enforce
 * object-level access. These helpers centralize the org-membership pattern
 * already used by routers such as guest.ts and bookingRequest.ts.
 */

export function forbidden(message = "Forbidden"): TRPCError {
  return new TRPCError({ code: "FORBIDDEN", message });
}

export function notFound(message = "Not found"): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message });
}

/**
 * Returns true if the user is a global admin, the org owner, or an org member.
 */
export async function isOrgMemberById(user: AppUser, orgId: string): Promise<boolean> {
  if (isAdmin(user)) return true;
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: { members: { where: { userId: user.id } } },
  });
  if (!org) return false;
  if (org.ownerId === user.id) return true;
  return org.members.length > 0;
}

/**
 * Throws FORBIDDEN unless the user is admin, org owner, or org member.
 */
export async function requireOrgMembership(user: AppUser, orgId: string): Promise<void> {
  const ok = await isOrgMemberById(user, orgId);
  if (!ok) throw forbidden();
}

/**
 * Loads the event and throws unless the user has org-level access to it.
 * Returns the event ({ id, orgId }).
 */
export async function requireEventAccess(user: AppUser, eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, orgId: true },
  });
  if (!event) throw notFound("Event not found");
  await requireOrgMembership(user, event.orgId);
  return event;
}

export const eventAccessInclude = {
  org: { include: { members: true } },
  stakeholders: { select: { userId: true, role: true } },
  shares: { select: { viewerUserId: true, scope: true } },
} as const;

export async function requireEventManageAccess(user: AppUser, eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: eventAccessInclude,
  });
  if (!event) throw notFound("Event not found");
  if (!canManageEvent(user, event)) throw forbidden();
  return event;
}

export async function requireAllowedEventAssignee(eventId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      org: { include: { members: true } },
      stakeholders: { select: { userId: true } },
    },
  });
  if (!event) throw notFound("Event not found");
  const allowed =
    event.createdById === assigneeId ||
    event.org.ownerId === assigneeId ||
    event.org.members.some((member) => member.userId === assigneeId) ||
    event.stakeholders.some((stakeholder) => stakeholder.userId === assigneeId);
  if (!allowed) throw forbidden("Assignee must belong to the event organization or stakeholder list");
}

/**
 * Set of org IDs the user belongs to (as owner or member).
 * Useful for filtering lists without N+1 lookups.
 */
export async function getUserOrgIds(user: AppUser): Promise<Set<string>> {
  const [memberships, owned] = await Promise.all([
    db.membership.findMany({ where: { userId: user.id }, select: { orgId: true } }),
    db.organization.findMany({ where: { ownerId: user.id }, select: { id: true } }),
  ]);
  const ids = new Set<string>();
  for (const m of memberships) ids.add(m.orgId);
  for (const o of owned) ids.add(o.id);
  return ids;
}

type ThreadVisibility = "INTERNAL" | "CLIENT_VISIBLE" | "PROVIDER_VISIBLE" | "ALL_PARTIES";

type ThreadForAccess = {
  orgId: string;
  visibility?: ThreadVisibility;
  participants: Array<{ userId: string | null; email: string; roleHint?: string | null }>;
  org?: Parameters<typeof isOrgMember>[1] | null;
  event?: Parameters<typeof canViewEvent>[1] | null;
  listing?: { orgId: string; org?: Parameters<typeof isOrgMember>[1] | null } | null;
};

function isThreadParticipant(user: AppUser, thread: ThreadForAccess): boolean {
  const email = user.email?.toLowerCase();
  return thread.participants.some(
    (participant) =>
      participant.userId === user.id ||
      Boolean(email && participant.email.toLowerCase() === email)
  );
}

function isThreadOrgMember(user: AppUser, thread: ThreadForAccess, userOrgIds: Set<string>): boolean {
  if (userOrgIds.has(thread.orgId)) return true;
  if (thread.org && isOrgMember(user, thread.org)) return true;
  const org = thread.event?.org;
  return Boolean(org && isOrgMember(user, org));
}

function isListingOrgMember(user: AppUser, thread: ThreadForAccess, userOrgIds: Set<string>): boolean {
  if (!thread.listing) return false;
  if (userOrgIds.has(thread.listing.orgId)) return true;
  return Boolean(thread.listing.org && isOrgMember(user, thread.listing.org));
}

/**
 * Returns true if the user may access the thread:
 * - global admin, or
 * - thread participant (by userId or email), or
 * - member/owner of the thread's org, or
 * - member/owner of the listing's org (vendor side) when the thread targets a listing.
 */
export function canReadThread(
  user: AppUser,
  thread: ThreadForAccess,
  userOrgIds: Set<string>
): boolean {
  if (isAdmin(user)) return true;
  const isParticipant = isThreadParticipant(user, thread);
  const isOrgSide = isThreadOrgMember(user, thread, userOrgIds);
  const isProviderSide = isListingOrgMember(user, thread, userOrgIds);

  switch (thread.visibility ?? "INTERNAL") {
    case "INTERNAL":
      return isOrgSide;
    case "CLIENT_VISIBLE":
      return isOrgSide || isParticipant || Boolean(thread.event && canViewEvent(user, thread.event));
    case "PROVIDER_VISIBLE":
      return isOrgSide || isProviderSide || isParticipant;
    case "ALL_PARTIES":
      return isOrgSide || isProviderSide || isParticipant || Boolean(thread.event && canViewEvent(user, thread.event));
    default:
      return false;
  }
}

export function canSendThread(
  user: AppUser,
  thread: ThreadForAccess,
  userOrgIds: Set<string>
): boolean {
  return canReadThread(user, thread, userOrgIds);
}

export const canAccessThread = canReadThread;

/**
 * Loads a thread (with participants and listing org) and throws unless the
 * user may access it. Returns the loaded thread.
 */
export async function requireThreadAccess(user: AppUser, threadId: string) {
  const thread = await db.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: true,
      event: { include: eventAccessInclude },
      listing: { include: { org: { include: { members: true } } } },
    },
  });
  if (!thread) throw notFound("Thread not found");
  const orgIds = await getUserOrgIds(user);
  if (!canReadThread(user, thread, orgIds)) throw forbidden();
  return thread;
}

export async function requireThreadSendAccess(user: AppUser, threadId: string) {
  const thread = await db.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: true,
      event: { include: eventAccessInclude },
      listing: { include: { org: { include: { members: true } } } },
    },
  });
  if (!thread) throw notFound("Thread not found");
  const orgIds = await getUserOrgIds(user);
  if (!canSendThread(user, thread, orgIds)) throw forbidden();
  return thread;
}
