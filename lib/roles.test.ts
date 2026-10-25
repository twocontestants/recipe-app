import { describe, expect, it } from 'vitest';
import {
  canGrantRoles,
  isModerator,
  isRole,
  parseRole,
  wouldRemoveLastModerator,
} from './roles';

describe('roles', () => {
  it('treats unknown values as cook', () => {
    expect(parseRole('admin')).toBe('cook');
    expect(parseRole('publisher')).toBe('cook');
    expect(parseRole(null)).toBe('cook');
    expect(isRole('publisher')).toBe(false);
    expect(isRole('cook')).toBe(true);
    expect(isRole('moderator')).toBe(true);
    expect(isRole('chef')).toBe(false);
  });

  it('limits role grants to moderators', () => {
    expect(canGrantRoles('cook')).toBe(false);
    expect(canGrantRoles('moderator')).toBe(true);
    expect(isModerator('moderator')).toBe(true);
    expect(isModerator('cook')).toBe(false);
  });

  it('refuses to demote the last moderator', () => {
    expect(wouldRemoveLastModerator('moderator', 'cook', 1)).toBe(true);
    expect(wouldRemoveLastModerator('moderator', 'cook', 2)).toBe(false);
    expect(wouldRemoveLastModerator('moderator', 'moderator', 1)).toBe(false);
    expect(wouldRemoveLastModerator('cook', 'moderator', 1)).toBe(false);
  });
});
