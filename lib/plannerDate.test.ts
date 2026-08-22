import { describe, expect, it } from 'vitest';
import {
  coordsFromPlannedOn,
  inferPlannedOn,
  mealOnDate,
  plannedOnOf,
  weekSpanForStoredKey,
} from './plannerDate';

describe('inferPlannedOn', () => {
  it('maps an Australian Sunday week key onto the following Monday week', () => {
    expect(inferPlannedOn('2026-08-16', 0)).toBe('2026-08-17');
    expect(inferPlannedOn('2026-08-16', 2)).toBe('2026-08-19');
  });

  it('maps a Monday week key with the weekday offset', () => {
    expect(inferPlannedOn('2026-08-17', 0)).toBe('2026-08-17');
    expect(inferPlannedOn('2026-08-17', 2)).toBe('2026-08-19');
  });
});

describe('coordsFromPlannedOn', () => {
  it('uses the ISO Monday, not a UTC-shifted Sunday', () => {
    expect(coordsFromPlannedOn('2026-08-17')).toEqual({ weekStart: '2026-08-17', dayOfWeek: 0 });
    expect(coordsFromPlannedOn('2026-08-19')).toEqual({ weekStart: '2026-08-17', dayOfWeek: 2 });
    expect(coordsFromPlannedOn('2026-08-16')).toEqual({ weekStart: '2026-08-10', dayOfWeek: 6 });
  });
});

describe('weekSpanForStoredKey', () => {
  it('treats Monday and legacy Sunday keys as the same kitchen week', () => {
    expect(weekSpanForStoredKey('2026-08-17')).toEqual({ from: '2026-08-17', to: '2026-08-23' });
    expect(weekSpanForStoredKey('2026-08-16')).toEqual({ from: '2026-08-17', to: '2026-08-23' });
  });
});

describe('mealOnDate / plannedOnOf', () => {
  it('prefers planned_on and infers from a Sunday-keyed pair', () => {
    expect(plannedOnOf({ planned_on: '2026-08-19' })).toBe('2026-08-19');
    expect(plannedOnOf({ week_start: '2026-08-16', day_of_week: 2 })).toBe('2026-08-19');
    expect(mealOnDate({ planned_on: '2026-08-19' }, '2026-08-19')).toBe(true);
    expect(mealOnDate({ week_start: '2026-08-16', day_of_week: 2 }, '2026-08-19')).toBe(true);
    expect(mealOnDate({ planned_on: '2026-08-19' }, '2026-08-18')).toBe(false);
  });
});
