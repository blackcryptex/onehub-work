import type { Role } from "@onehub/types/src/roles";

/**
 * Centralized route helper for role-aware navigation
 * 
 * This module ensures all event/vault navigation is role-aware and consistent.
 * All components should use these helpers instead of hardcoded route strings.
 * 
 * Role-to-path mapping:
 * - DIY_PLANNER: /diy-planner/vault/*
 * - PRO_PLANNER: /pro/planner/vault/*
 * - VENDOR/VENUE/ADMIN/others: /app/vault/* (legacy route)
 * 
 * Shared routes (not role-specific):
 * - Proposals: /app/proposals/[id]
 * - Contracts: /app/contracts/[id]
 */

/**
 * Get the vault base path for a given role
 */
export function getVaultBasePath(role: Role | undefined): string {
  switch (role) {
    case "DIY_PLANNER":
      return "/diy-planner/vault";
    case "PRO_PLANNER":
      return "/pro/planner/vault";
    default:
      // VENDOR, VENUE, ADMIN, CLIENT, EVENT_DREAMER use legacy route
      return "/app/vault";
  }
}

/**
 * Get the vault index (list) route for a given role
 */
export function vaultIndex(role: Role | undefined): string {
  return getVaultBasePath(role);
}

/**
 * Get the vault detail route for a given role and event slug
 */
export function vaultDetail(role: Role | undefined, eventSlug: string): string {
  const base = getVaultBasePath(role);
  return `${base}/${eventSlug}`;
}

/**
 * Get the event detail route
 * Note: Uses /events route (route group (app) doesn't appear in URL)
 */
export function eventDetail(eventSlug: string): string {
  return `/events/${eventSlug}`;
}

/**
 * Get the event budget route
 * Note: Uses /events route (route group (app) doesn't appear in URL)
 */
export function eventBudget(role: Role | undefined, eventSlug: string): string {
  return `/events/${eventSlug}/budget`;
}

/**
 * Get the event guests route
 * Note: Uses /events route (route group (app) doesn't appear in URL)
 */
export function eventGuests(role: Role | undefined, eventSlug: string): string {
  return `/events/${eventSlug}/guests`;
}

/**
 * Get the event checklists route
 * Note: Uses /events route (route group (app) doesn't appear in URL)
 */
export function eventChecklists(role: Role | undefined, eventSlug: string): string {
  return `/events/${eventSlug}/checklists`;
}

/**
 * Get the event proposals route
 * Note: Uses /events route (route group (app) doesn't appear in URL)
 */
export function eventProposals(role: Role | undefined, eventSlug: string): string {
  return `/events/${eventSlug}/proposals`;
}

/**
 * Get the proposal detail route (shared across all roles)
 */
export function proposalDetail(proposalId: string): string {
  return `/app/proposals/${proposalId}`;
}

/**
 * Get the contract detail route (shared across all roles)
 */
export function contractDetail(contractId: string): string {
  return `/app/contracts/${contractId}`;
}

/**
 * Get the dashboard route for a given role
 */
export function dashboard(role: Role | undefined): string {
  switch (role) {
    case "DIY_PLANNER":
      return "/diy-planner";
    case "PRO_PLANNER":
      return "/pro/planner";
    case "VENDOR":
      return "/vendor/dashboard";
    case "VENUE":
      return "/venue/dashboard";
    default:
      return "/app";
  }
}

