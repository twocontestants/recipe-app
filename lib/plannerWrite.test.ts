import { describe, expect, it, vi } from 'vitest';
import {
  dinnerAddFailedMessage,
  dinnerAddedMessage,
  plannerDinnerPayload,
  postPlannerDinner,
  readResponseError,
} from './plannerWrite';

describe('plannerDinnerPayload', () => {
  it('builds a dinner POST body with a servings fallback', () => {
    expect(plannerDinnerPayload({
      plannedOn: '2026-10-07',
      weekStart: '2026-10-05',
      dayOfWeek: 2,
      recipeId: 'r1',
    })).toEqual({
      planned_on: '2026-10-07',
      week_start: '2026-10-05',
      day_of_week: 2,
      meal_type: 'dinner',
      recipe_id: 'r1',
      servings: 4,
    });
  });
});

describe('dinner copy', () => {
  it('names the calendar day in the success toast', () => {
    expect(dinnerAddedMessage(new Date(2026, 9, 7))).toMatch(/Dinner added for/i);
  });

  it('keeps a usable failure line even without a server detail', () => {
    expect(dinnerAddFailedMessage('Planner is full')).toBe("Couldn't add dinner — Planner is full");
    expect(dinnerAddFailedMessage('  ')).toBe("Couldn't add dinner");
  });
});

describe('readResponseError', () => {
  it('reads JSON error text', async () => {
    const res = new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 });
    expect(await readResponseError(res)).toBe('Recipe not found');
  });

  it('does not throw when the body is an HTML error page', async () => {
    const res = new Response('<!DOCTYPE html><html><body>Internal Server Error</body></html>', {
      status: 500,
      statusText: 'Internal Server Error',
    });
    await expect(readResponseError(res)).resolves.toBe('Internal Server Error');
  });
});

describe('postPlannerDinner', () => {
  it('posts the dinner body and returns the saved row', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toMatchObject({ recipe_id: 'r1', meal_type: 'dinner' });
      return {
        ok: true,
        json: async () => ({ id: 'm1', recipe_id: 'r1' }),
      };
    }));
    await expect(postPlannerDinner(plannerDinnerPayload({
      plannedOn: '2026-10-07',
      weekStart: '2026-10-05',
      dayOfWeek: 2,
      recipeId: 'r1',
    }))).resolves.toEqual({ id: 'm1', recipe_id: 'r1' });
    vi.unstubAllGlobals();
  });

  it('throws a readable error instead of a JSON parse failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      statusText: 'Internal Server Error',
      text: async () => '<!DOCTYPE html>',
      json: async () => { throw new SyntaxError("Unexpected token '<'"); },
    })));
    await expect(postPlannerDinner(plannerDinnerPayload({
      plannedOn: '2026-10-07',
      weekStart: '2026-10-05',
      dayOfWeek: 2,
      recipeId: 'r1',
    }))).rejects.toThrow('Internal Server Error');
    vi.unstubAllGlobals();
  });
});
