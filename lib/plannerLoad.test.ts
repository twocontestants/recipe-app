import { describe, expect, it } from 'vitest';
import {
  displayWeekDateRange,
  hasMealRecipeMethod,
  notesByDisplayIndex,
  sameDisplayWeek,
} from './plannerLoad';

describe('sameDisplayWeek', () => {
  it('treats identical YYYY-MM-DD labels as the same week', () => {
    expect(sameDisplayWeek('2026-08-24', '2026-08-24')).toBe(true);
    expect(sameDisplayWeek('2026-08-24', '2026-08-17')).toBe(false);
  });
});

describe('displayWeekDateRange', () => {
  it('covers seven calendar days from the display week start', () => {
    expect(displayWeekDateRange('2026-08-24')).toEqual({ from: '2026-08-24', to: '2026-08-30' });
  });
});

describe('notesByDisplayIndex', () => {
  it('maps calendar-day notes onto display-day indexes', () => {
    expect(notesByDisplayIndex(
      { '2026-08-24': 'Mon', '2026-08-26': 'Wed', '2026-08-31': 'next' },
      '2026-08-24',
    )).toEqual({ 0: 'Mon', 2: 'Wed' });
  });
});

describe('hasMealRecipeMethod', () => {
  it('treats missing method arrays as a card', () => {
    expect(hasMealRecipeMethod({ recipe: {} })).toBe(false);
    expect(hasMealRecipeMethod({ recipe: { ingredients: [], steps: [] } })).toBe(true);
  });
});
