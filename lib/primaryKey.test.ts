import { describe, expect, it } from 'vitest';
import { primaryKeyMatches } from './primaryKey';

describe('primaryKeyMatches', () => {
  it('treats the same columns as a match even when attnum order differs', () => {
    expect(primaryKeyMatches(['key', 'owner_id'], ['owner_id', 'key'])).toBe(true);
    expect(primaryKeyMatches(['owner_id', 'week_start', 'day_of_week'], ['week_start', 'day_of_week', 'owner_id'])).toBe(true);
  });

  it('rejects a different set of columns', () => {
    expect(primaryKeyMatches(['key'], ['owner_id', 'key'])).toBe(false);
    expect(primaryKeyMatches(['owner_id', 'key'], ['owner_id', 'name'])).toBe(false);
  });
});
