import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GenerateListModal from './GenerateListModal';
import { dayDateOf, getThisDisplayWeek, localDateIso, shiftWeek } from '@/lib/plannerDays';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderModal(overrides: Partial<ComponentProps<typeof GenerateListModal>> = {}) {
  const props = {
    onClose: vi.fn(),
    onCreated: vi.fn(),
    weekStartsOn: 'monday' as const,
    ...overrides,
  };
  render(<GenerateListModal {...props} />);
  return props;
}

describe('GenerateListModal generate payload', () => {
  it('posts only the ticked dinner when the same recipe is also last week', async () => {
    const thisWeek = getThisDisplayWeek('monday');
    const lastWeek = shiftWeek(thisWeek, -1);
    const thisWed = localDateIso(dayDateOf(thisWeek, 2));
    const lastWed = localDateIso(dayDateOf(lastWeek, 2));

    const postBodies: unknown[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/planner')) {
        return {
          json: async () => [
            {
              recipe_id: 'r-pie',
              recipe: { title: 'Chicken pie' },
              planned_on: lastWed,
              week_start: lastWeek,
              day_of_week: 2,
            },
            {
              recipe_id: 'r-pie',
              recipe: { title: 'Chicken pie' },
              planned_on: thisWed,
              week_start: thisWeek,
              day_of_week: 2,
            },
          ],
        };
      }
      if (url.includes('/api/shopping-lists') && init?.method === 'POST') {
        postBodies.push(JSON.parse(String(init.body)));
        return { ok: true, json: async () => ({ id: 'list-1' }) };
      }
      return { ok: false, json: async () => ({}) };
    }));

    const props = renderModal({ defaultWeekStart: thisWeek });
    const rows = await screen.findAllByText('Chicken pie');
    expect(rows).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /generate list/i }));

    await waitFor(() => expect(postBodies).toHaveLength(1));
    const body = postBodies[0] as {
      recipe_ids: string[];
      meals: Array<{ recipe_id: string; planned_on: string }>;
    };
    expect(body.recipe_ids).toEqual(['r-pie']);
    expect(body.meals).toEqual([
      expect.objectContaining({ recipe_id: 'r-pie', planned_on: thisWed }),
    ]);
    expect(body.meals.some(m => m.planned_on === lastWed)).toBe(false);
    expect(props.onCreated).toHaveBeenCalledWith('list-1');
  });
});
