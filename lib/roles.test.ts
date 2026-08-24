import { describe, expect, it } from 'vitest';
import {
  canGrantRoles,
  canPublishOwn,
  isModerator,
  isRole,
  parseRole,
  wouldRemoveLastModerator,
} from './roles';

describe('roles', () => {
  it('treats unknown values as cook', () => {
    expect(parseRole('admin')).toBe('cook');
    expect(parseRole(null)).toBe('cook');
    expect(isRole('publisher')).toBe(true);
    expect(isRole('chef')).toBe(false);
  });

  it('lets publishers and moderators publish their own recipes', () => {
    expect(canPublishOwn('cook')).toBe(false);
    expect(canPublishOwn('publisher')).toBe(true);
    expect(canPublishOwn('moderator')).toBe(true);
  });

  it('limits role grants to moderators', () => {
    expect(canGrantRoles('cook')).toBe(false);
    expect(canGrantRoles('publisher')).toBe(false);
    expect(canGrantRoles('moderator')).toBe(true);
    expect(isModerator('moderator')).toBe(true);
  });

  it('refuses to demote the last moderator', () => {
    expect(wouldRemoveLastModerator('moderator', 'cook', 1)).toBe(true);
    expect(wouldRemoveLastModerator('moderator', 'publisher', 1)).toBe(true);
    expect(wouldRemoveLastModerator('moderator', 'cook', 2)).toBe(false);
    expect(wouldRemoveLastModerator('moderator', 'moderator', 1)).toBe(false);
    expect(wouldRemoveLastModerator('publisher', 'cook', 1)).toBe(false);
  });
});
