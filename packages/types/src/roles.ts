/**
 * Role type for RBAC in OneHub.
 */
export type Role =
  | "DIY_PLANNER"
  | "PRO_PLANNER"
  | "VENDOR"
  | "VENUE"
  | "CLIENT"
  | "EVENT_DREAMER"
  | "ADMIN";

export interface RoleUserLike {
  role?: Role | null;
}

/**
 * Returns true if the user has the specified role.
 */
export function hasRole(user: RoleUserLike | null | undefined, role: Role): boolean {
  return Boolean(user?.role === role);
}

/**
 * Returns a guard function that checks if a user has one of the required roles.
 */
export function requireRole(roles: Role[]) {
  return (user: RoleUserLike | null | undefined): boolean => {
    if (!user?.role) return false;
    return roles.includes(user.role);
  };
}
