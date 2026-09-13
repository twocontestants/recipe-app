import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMealsForMonths,
  fetchNotesForMonths,
  mergePlannerMeals,
  mergePlannerNotes,
  parsePlannerNotes,
  replaceNotesInRange,
} from './loadPlannerMonth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMealsForMonths', () => {
  it('sends client storage week keys with the month range', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'm1', week_start: '2026-08-16' }],
    });
    vi.stubGlobal('fetch', fetchMock);
    await fetchMealsForMonths(['2026-08']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('from=2026-08-01');
    expect(url).toContain('to=2026-08-31');
    expect(url).toContain('weeks=');
  });
});

describe('fetchNotesForMonths', () => {
  it('uses the same month from/to as meals, without weeks=', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '2026-08-24': 'Defrost' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const notes = await fetchNotesForMonths(['2026-08']);
    expect(notes).toEqual({ '2026-08-24': 'Defrost' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/planner-notes?');
    expect(url).toContain('from=2026-08-01');
    expect(url).toContain('to=2026-08-31');
    expect(url).not.toContain('weeks=');
  });

  it('merges one request per month key', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes('from=2026-08-01')
        ? { '2026-08-31': 'Aug' }
        : { '2026-09-01': 'Sep' };
      return { ok: true, json: async () => body };
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchNotesForMonths(['2026-08', '2026-09'])).toEqual({
      '2026-08-31': 'Aug',
      '2026-09-01': 'Sep',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('mergePlannerMeals', () => {
  it('dedupes by id with later batches winning', () => {
    const merged = mergePlannerMeals(
      [{ id: 'a', week_start: '2026-08-16' } as never],
      [{ id: 'a', week_start: '2026-08-17' } as never, { id: 'b', week_start: '2026-08-23' } as never],
    );
    expect(merged.map(meal => meal.id)).toEqual(['a', 'b']);
    expect(merged[0].week_start).toBe('2026-08-17');
  });
});

describe('parsePlannerNotes', () => {
  it('keeps trimmed day notes and drops junk', () => {
    expect(parsePlannerNotes({
      '2026-08-24': '  Mon  ',
      '2026-08-25': '',
      '2026-08-26': 3,
    })).toEqual({ '2026-08-24': '  Mon  ' });
    expect(parsePlannerNotes(null)).toEqual({});
    expect(parsePlannerNotes(['nope'])).toEqual({});
  });
});

describe('mergePlannerNotes', () => {
  it('later batches overwrite the same ISO day', () => {
    expect(mergePlannerNotes(
      { '2026-08-24': 'old', '2026-08-25': 'keep' },
      { '2026-08-24': 'new' },
    )).toEqual({ '2026-08-24': 'new', '2026-08-25': 'keep' });
  });
});

describe('replaceNotesInRange', () => {
  it('clears the month window then writes incoming days, including empty months', () => {
    const store = new Map([
      ['2026-07-31', 'Jul'],
      ['2026-08-10', 'stale'],
      ['2026-09-01', 'Sep'],
    ]);
    replaceNotesInRange(store, '2026-08-01', '2026-08-31', {
      '2026-08-24': 'fresh',
      '2026-08-25': '  ',
      '2026-07-31': 'ignore-outside',
    });
    expect([...store.entries()]).toEqual([
      ['2026-07-31', 'Jul'],
      ['2026-09-01', 'Sep'],
      ['2026-08-24', 'fresh'],
    ]);
    replaceNotesInRange(store, '2026-08-01', '2026-08-31', {});
    expect(store.has('2026-08-24')).toBe(false);
    expect(store.get('2026-07-31')).toBe('Jul');
  });
});
