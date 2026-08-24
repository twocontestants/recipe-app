import { addCalendarDays } from './plannerMonth';
import {
  jsSundayToMonIndex,
  localDateIso,
  mondayOf,
  parseDayOfWeek,
  parseLocalIso,
} from './plannerDays';

const DAY_ISO = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Normalize a kitchen calendar day to YYYY-MM-DD.
 * Already-correct strings pass through. Also accepts an ISO timestamp or a
 * JS Date from older pg DATE parsing — it does not compute a new date.
 */
export function toDayIso(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const iso = DAY_ISO.exec(s);
  if (iso) return iso[1];
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return '';
}

export function dateIso(value: string | Date): string {
  if (value instanceof Date) return localDateIso(value);
  const iso = toDayIso(value);
  return iso || String(value).slice(0, 10);
}

/** Kitchen date from a stored week key + Monday-canonical weekday. */
export function inferPlannedOn(weekStart: string, dayOfWeek: unknown): string {
  const dow = parseDayOfWeek(dayOfWeek);
  if (dow === null) throw new Error('day_of_week must be 0–6 or a weekday name');
  const start = parseLocalIso(weekStart);
  const monday = new Date(start);
  const jsDay = start.getDay();
  if (jsDay !== 1) {
    monday.setDate(start.getDate() + (jsDay === 0 ? 1 : 8 - jsDay));
  }
  monday.setDate(monday.getDate() + dow);
  return localDateIso(monday);
}

/** ISO Monday + 0–6 weekday from a calendar date. Never uses toISOString(). */
export function coordsFromPlannedOn(plannedOn: string): { weekStart: string; dayOfWeek: number } {
  const date = parseLocalIso(plannedOn);
  return {
    weekStart: localDateIso(mondayOf(date)),
    dayOfWeek: jsSundayToMonIndex(date.getDay()),
  };
}

/**
 * Week span for a stored or requested week key.
 * Monday key → that Monday…Sunday. Sunday key (legacy AU) → next Monday…Sunday.
 */
export function weekSpanForStoredKey(key: string): { from: string; to: string } {
  const date = parseLocalIso(key);
  if (date.getDay() === 0) {
    const from = addCalendarDays(key, 1);
    return { from, to: addCalendarDays(from, 6) };
  }
  const from = localDateIso(mondayOf(date));
  return { from, to: addCalendarDays(from, 6) };
}

export function plannedOnOf(meal: {
  planned_on?: string | Date | null;
  week_start?: string | Date | null;
  day_of_week?: unknown;
}): string {
  if (meal.planned_on != null && String(meal.planned_on).trim() !== '') {
    return dateIso(meal.planned_on);
  }
  if (meal.week_start == null) return '';
  const dow = parseDayOfWeek(meal.day_of_week);
  if (dow === null) return '';
  return inferPlannedOn(dateIso(meal.week_start), dow);
}

export function mealOnDate(
  meal: {
    planned_on?: string | Date | null;
    week_start?: string | Date | null;
    day_of_week?: unknown;
  },
  iso: string,
): boolean {
  const planned = plannedOnOf(meal);
  return Boolean(planned) && planned === iso;
}
