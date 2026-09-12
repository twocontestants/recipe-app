import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GenerateListModal from './GenerateListModal';
import { mealDayLabel } from '@/lib/generateListOptions';
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

function dinner(overrides: {
  id?: string;
  recipe_id?: string;
  title?: string;
  planned_on: string;
  week_start: string;
  day_of_week?: number;
}) {
  return {
    id: overrides.id,
    recipe_id: overrides.recipe_id ?? 'r-pie',
    recipe: { title: overrides.title ?? 'Chicken pie' },
    planned_on: overrides.planned_on,
    week_start: overrides.week_start,
    day_of_week: overrides.day_of_week ?? 0,
  };
}

function stubFetch(plans: unknown[]) {
  const postBodies: unknown[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/planner')) {
      return { json: async () => plans };
    }
    if (url.includes('/api/shopping-lists') && init?.method === 'POST') {
      postBodies.push(JSON.parse(String(init.body)));
      return { ok: true, json: async () => ({ id: 'list-1' }) };
    }
    return { ok: false, json: async () => ({}) };
  }));
  return postBodies;
}

describe('GenerateListModal', () => {
  const thisWeek = getThisDisplayWeek('monday');
  const lastWeek = shiftWeek(thisWeek, -1);
  const nextWeek = shiftWeek(thisWeek, 1);
  const today = localDateIso(new Date());
  const thisMon = localDateIso(dayDateOf(thisWeek, 0));
  const pastThisWeek = thisMon < today ? thisMon : null;
  const lastWed = localDateIso(dayDateOf(lastWeek, 2));
  const nextMon = localDateIso(dayDateOf(nextWeek, 0));

  it('posts only remaining this-week dinners, not last week or already-cooked days', async () => {
    const postBodies = stubFetch([
      dinner({ id: 'last', planned_on: lastWed, week_start: lastWeek, day_of_week: 2 }),
      ...(pastThisWeek
        ? [dinner({ id: 'past', planned_on: pastThisWeek, week_start: thisWeek, day_of_week: 0 })]
        : []),
      dinner({ id: 'today', planned_on: today, week_start: thisWeek }),
    ]);

    const props = renderModal({ defaultWeekStart: thisWeek });
    const rows = await screen.findAllByText('Chicken pie');
    expect(rows).toHaveLength(pastThisWeek ? 3 : 2);

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.filter(box => (box as HTMLInputElement).checked)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /generate list/i }));

    await waitFor(() => expect(postBodies).toHaveLength(1));
    const body = postBodies[0] as {
      recipe_ids: string[];
      meals: Array<{ id?: string; recipe_id: string; planned_on: string }>;
    };
    expect(body.recipe_ids).toEqual(['r-pie']);
    expect(body.meals).toEqual([
      expect.objectContaining({ id: 'today', recipe_id: 'r-pie', planned_on: today }),
    ]);
    expect(body.meals.some(m => m.planned_on === lastWed)).toBe(false);
    if (pastThisWeek) {
      expect(body.meals.some(m => m.planned_on === pastThisWeek)).toBe(false);
    }
    expect(props.onCreated).toHaveBeenCalledWith('list-1');
  });

  it('hides empty last and next weeks, and always shows this week', async () => {
    stubFetch([]);
    renderModal();
    await screen.findByText(/nothing planned for this week/i);
    expect(screen.getByText('this week')).toBeTruthy();
    expect(screen.queryByText('last week')).toBeNull();
    expect(screen.queryByText('next week')).toBeNull();
  });

  it('shows last week when it has dinners, unticked by default', async () => {
    stubFetch([
      dinner({ id: 'last', planned_on: lastWed, week_start: lastWeek, day_of_week: 2 }),
      dinner({ id: 'today', planned_on: today, week_start: thisWeek }),
    ]);
    renderModal();
    await screen.findAllByText('Chicken pie');
    expect(screen.getByText('last week')).toBeTruthy();
    expect(screen.getByText('this week')).toBeTruthy();
    expect(screen.queryByText('next week')).toBeNull();
  });

  it('ticks the planner week when opened from next week', async () => {
    const postBodies = stubFetch([
      dinner({ id: 'today', planned_on: today, week_start: thisWeek }),
      dinner({ id: 'next', planned_on: nextMon, week_start: nextWeek, day_of_week: 0 }),
    ]);
    renderModal({ defaultWeekStart: nextWeek });
    await screen.findAllByText('Chicken pie');
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes.filter(box => box.checked)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /generate list/i }));
    await waitFor(() => expect(postBodies).toHaveLength(1));
    const body = postBodies[0] as { meals: Array<{ id?: string; planned_on: string }> };
    expect(body.meals).toEqual([
      expect.objectContaining({ id: 'next', planned_on: nextMon }),
    ]);
  });

  it('shows a calendar date and keeps two same-day recipes independently ticked', async () => {
    const postBodies = stubFetch([
      dinner({ id: 'mp-a', planned_on: today, week_start: thisWeek, title: 'Chicken pie' }),
      dinner({ id: 'mp-b', planned_on: today, week_start: thisWeek, title: 'Chicken pie' }),
    ]);
    renderModal();
    const boxes = await screen.findAllByRole('checkbox', { name: /chicken pie/i });
    expect(boxes).toHaveLength(2);
    expect((boxes[0] as HTMLInputElement).checked).toBe(true);
    expect((boxes[1] as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText(mealDayLabel(today)).length).toBeGreaterThan(0);

    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole('button', { name: /generate list/i }));
    await waitFor(() => expect(postBodies).toHaveLength(1));
    const body = postBodies[0] as { meals: Array<{ id?: string }> };
    expect(body.meals).toEqual([expect.objectContaining({ id: 'mp-a' })]);
  });

  it('groups dinners using the household week-start day', async () => {
    const sundayThis = getThisDisplayWeek('sunday');
    const sundayNext = shiftWeek(sundayThis, 1);
    stubFetch([
      dinner({
        id: 'sun',
        planned_on: sundayThis,
        week_start: sundayThis,
        day_of_week: 6,
      }),
    ]);
    renderModal({ weekStartsOn: 'sunday', defaultWeekStart: sundayNext });
    await screen.findByText('Chicken pie');
    expect(screen.getByText('this week')).toBeTruthy();
    expect(screen.getByText('next week')).toBeTruthy();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });
});
