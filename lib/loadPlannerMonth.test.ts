import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMealsForMonths, mergePlannerMeals } from './loadPlannerMonth';

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
