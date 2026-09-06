import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { dayDateOf, getThisDisplayWeek, localDateIso, shiftWeek } from '@/lib/plannerDays';
import { monthCalendarCells, monthKeyOf } from '@/lib/plannerMonth';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u1', login_name: 'cook', display_name: 'Cook', role: 'cook' },
    loading: false,
    refresh: async () => {},
    logout: async () => {},
  }),
}));

vi.mock('@/components/usePlannerLive', () => ({
  usePlannerLive: () => ({ broadcastPlannerChanged: vi.fn() }),
}));

import PlannerClient from './PlannerClient';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function dinner(id: string, plannedOn: string) {
  return {
    id,
    planned_on: plannedOn,
    week_start: plannedOn,
    recipe_id: id,
    day_of_week: 0,
    meal_type: 'dinner',
    servings: 4,
    recipe: {
      title: `Meal ${id}`,
      primary_protein: 'chicken',
      cook_time: 30,
      servings: 4,
      tags: ['High Protein'],
    },
  };
}

describe('PlannerClient week nav', () => {
  it('shows a compact week strip and a single Auto-plan action', async () => {
    const thisWeek = getThisDisplayWeek('monday');
    const lastWeek = shiftWeek(thisWeek, -1);
    const mon = localDateIso(dayDateOf(thisWeek, 0));
    const wed = localDateIso(dayDateOf(thisWeek, 2));
    const lastMon = localDateIso(dayDateOf(lastWeek, 0));
    const lastTue = localDateIso(dayDateOf(lastWeek, 1));
    const lastWed = localDateIso(dayDateOf(lastWeek, 2));

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/preferences')) {
        return { ok: true, json: async () => ({ weekStartDay: 'monday' }) };
      }
      if (url.includes('/api/planner-notes')) {
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes('/api/planner')) {
        return {
          ok: true,
          json: async () => [
            dinner('this-mon-a', mon),
            dinner('this-mon-b', mon),
            dinner('this-wed', wed),
            dinner('last-mon', lastMon),
            dinner('last-tue', lastTue),
            dinner('last-wed', lastWed),
          ],
        };
      }
      return { ok: false, json: async () => ({}) };
    }));

    Element.prototype.scrollIntoView = vi.fn();
    render(<PlannerClient />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /monday .* planned/i })).toBeTruthy();
    });
    expect(screen.queryByText(/of 7 planned/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Auto-plan' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Jump to a date' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Shopping list' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Previous week' })).toBeNull();
    const monday = screen.getByRole('tab', { name: /monday .* planned/i });
    const tuesday = screen.getByRole('tab', { name: /tuesday .* nothing planned/i });
    expect(monday.className).toContain('is-planned');
    expect(tuesday.className).toContain('is-empty');
    expect(tuesday.className).not.toContain('is-planned');

    expect(screen.getAllByRole('tab')).toHaveLength(7);
    expect(screen.getAllByRole('tab').some(el => el.className.includes('is-today'))).toBe(true);
    expect(screen.getAllByRole('button', { name: /add dinner/i }).length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByPlaceholderText(/add a note/i)).toBeNull();
    expect(screen.queryByText(/this week's suggestions/i)).toBeNull();
    expect(screen.queryByText(/add another/i)).toBeNull();
  });

  it('expands the week navbar into a month calendar and jumps to another day', async () => {
    const thisWeek = getThisDisplayWeek('monday');
    const mon = localDateIso(dayDateOf(thisWeek, 0));
    const thisWeekDays = new Set(Array.from({ length: 7 }, (_, i) => localDateIso(dayDateOf(thisWeek, i))));
    const other = monthCalendarCells(monthKeyOf(localDateIso(new Date())), 'monday')
      .find(cell => cell.inMonth && !thisWeekDays.has(cell.iso));
    expect(other).toBeTruthy();
    const otherDate = new Date(`${other!.iso}T12:00:00`);
    const otherLabel = otherDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/preferences')) {
        return { ok: true, json: async () => ({ weekStartDay: 'monday' }) };
      }
      if (url.includes('/api/planner-notes')) {
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes('/api/planner')) {
        return { ok: true, json: async () => [dinner('this-mon-a', mon)] };
      }
      return { ok: false, json: async () => ({}) };
    }));

    Element.prototype.scrollIntoView = vi.fn();
    render(<PlannerClient />);

    const open = await screen.findByRole('button', { name: 'Open calendar' });
    fireEvent.click(open);
    expect(screen.getByRole('dialog', { name: 'Month calendar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    const jump = await screen.findByRole('button', { name: new RegExp(`^${otherLabel}`, 'i') });
    fireEvent.click(jump);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Month calendar' })).toBeNull();
    });
    const otherWeekday = otherDate.toLocaleDateString('en-AU', { weekday: 'long' });
    expect(
      screen.getByRole('tab', { name: new RegExp(`^${otherWeekday} ${otherDate.getDate()}`, 'i') })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('opens the existing context menu from the three-dot button', async () => {
    const thisWeek = getThisDisplayWeek('monday');
    const mon = localDateIso(dayDateOf(thisWeek, 0));

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/preferences')) {
        return { ok: true, json: async () => ({ weekStartDay: 'monday' }) };
      }
      if (url.includes('/api/planner-notes')) {
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes('/api/planner')) {
        return { ok: true, json: async () => [dinner('this-mon-a', mon)] };
      }
      return { ok: false, json: async () => ({}) };
    }));

    Element.prototype.scrollIntoView = vi.fn();
    render(<PlannerClient />);

    const menuBtn = await screen.findByRole('button', { name: 'Meal options' });
    fireEvent.click(menuBtn);
    expect(screen.getByRole('menuitem', { name: 'View recipe' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Edit recipe' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Replace' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /move to/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeTruthy();
  });
});
