import type { Role } from "./policy";

export function effectiveRoles(
  legacyRole: Role,
  explicitRoles: readonly Role[],
): Role[] {
  const authoritative = explicitRoles.length ? explicitRoles : [legacyRole];
  return Array.from(new Set(authoritative));
}

export function compatibilityRole(roles: readonly Role[]): Role {
  if (!roles.length) throw new Error("INVALID_ROLES");
  return roles[0];
}
