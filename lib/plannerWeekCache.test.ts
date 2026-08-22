import { describe, expect, it } from 'vitest';
import {
  invalidateStorageWeeks,
  missingStorageWeeks,
  readStorageWeeks,
  writeStorageWeek,
} from './plannerWeekCache';

describe('plannerWeekCache', () => {
  it('reports weeks that have not been fetched yet', () => {
    const cache = new Map<string, { id: string }[]>();
    writeStorageWeek(cache, '2026-08-17', [{ id: 'a' }]);
    expect(missingStorageWeeks(['2026-08-17', '2026-08-24'], cache)).toEqual(['2026-08-24']);
  });

  it('reads cached weeks without treating a miss as empty until written', () => {
    const cache = new Map<string, { id: string }[]>();
    writeStorageWeek(cache, '2026-08-17', [{ id: 'a' }]);
    expect(readStorageWeeks(cache, ['2026-08-17', '2026-08-24'])).toEqual([{ id: 'a' }]);
    expect(missingStorageWeeks(['2026-08-17'], cache)).toEqual([]);
  });

  it('re-fetches a week after invalidate', () => {
    const cache = new Map<string, { id: string }[]>();
    writeStorageWeek(cache, '2026-08-17', [{ id: 'a' }]);
    invalidateStorageWeeks(cache, ['2026-08-17']);
    expect(missingStorageWeeks(['2026-08-17'], cache)).toEqual(['2026-08-17']);
    expect(readStorageWeeks(cache, ['2026-08-17'])).toEqual([]);
  });
});
