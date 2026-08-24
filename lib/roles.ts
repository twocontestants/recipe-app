export const ROLES = ['cook', 'publisher', 'moderator'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  login_name: string;
  display_name: string;
  role: Role;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function parseRole(value: unknown): Role {
  return isRole(value) ? value : 'cook';
}

export function canPublishOwn(role: Role): boolean {
  return role === 'publisher' || role === 'moderator';
}

export function isModerator(role: Role): boolean {
  return role === 'moderator';
}

export function canGrantRoles(role: Role): boolean {
  return role === 'moderator';
}

/** True if demoting this account would leave the platform with zero moderators. */
export function wouldRemoveLastModerator(
  currentRole: Role,
  nextRole: Role,
  moderatorCount: number,
): boolean {
  return currentRole === 'moderator' && nextRole !== 'moderator' && moderatorCount <= 1;
}
