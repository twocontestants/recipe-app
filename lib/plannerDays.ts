import { coordsFromPlannedOn, inferPlannedOn } from './plannerDate';

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_SHORT: Record<DayKey, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const DAY_ALIASES: Record<string, number> = {
  monday: 0,
  mon: 0,
  tuesday: 1,
  tue: 1,
  tues: 1,
  wednesday: 2,
  wed: 2,
  thursday: 3,
  thu: 3,
  thur: 3,
  thurs: 3,
  friday: 4,
  fri: 4,
  saturday: 5,
  sat: 5,
  sunday: 6,
  sun: 6,
};

/** Accept 0–6 or a weekday name. Invalid values return null so callers can 400. */
export function parseDayOfWeek(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed in DAY_ALIASES) return DAY_ALIASES[trimmed];
    if (/^[0-6]$/.test(trimmed)) return Number(trimmed);
  }
  return null;
}

export function dayKeyToIndex(key: string): number | null {
  return parseDayOfWeek(key);
}

export function indexToDayKey(index: number): DayKey {
  if (!Number.isInteger(index) || index < 0 || index > 6) {
    throw new Error(`day index must be 0–6, got ${index}`);
  }
  return DAY_KEYS[index];
}

/** JS Date.getDay() Sunday=0 → Monday-canonical 0–6. */
export function jsSundayToMonIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function todayDayIndex(now = new Date()): number {
  return jsSundayToMonIndex(now.getDay());
}

/** Household week-start setting. Junk values become Monday. */
export function parseWeekStartDay(value: unknown): DayKey {
  const parsed = parseDayOfWeek(value);
  if (parsed === null) return 'monday';
  return indexToDayKey(parsed);
}

export function startOfDisplayWeek(date: Date, weekStartsOn: DayKey = 'monday'): Date {
  const startIdx = parseDayOfWeek(weekStartsOn) ?? 0;
  const current = jsSundayToMonIndex(date.getDay());
  const delta = (current - startIdx + 7) % 7;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - delta);
  return d;
}

export function displayDays(weekStartsOn: DayKey = 'monday'): DayKey[] {
  const start = parseDayOfWeek(weekStartsOn) ?? 0;
  return Array.from({ length: 7 }, (_, i) => DAY_KEYS[(start + i) % 7]);
}

export function displayDayIndex(date: Date, weekStartsOn: DayKey = 'monday'): number {
  const start = parseDayOfWeek(weekStartsOn) ?? 0;
  const current = jsSundayToMonIndex(date.getDay());
  return (current - start + 7) % 7;
}

export type PlannerDayTone = 'past' | 'today' | 'upcoming';

/** Visual tone for a planner day. Other weeks never count as today or past. */
export function plannerDayTone(
  viewingThisWeek: boolean,
  dayIndex: number,
  todayIndex: number,
): PlannerDayTone {
  if (!viewingThisWeek) return 'upcoming';
  if (dayIndex === todayIndex) return 'today';
  if (dayIndex < todayIndex) return 'past';
  return 'upcoming';
}

export function getThisDisplayWeek(weekStartsOn: DayKey = 'monday', now = new Date()): string {
  return localDateIso(startOfDisplayWeek(now, weekStartsOn));
}

/** Monday-canonical storage pair for a calendar date. */
export function storageCoords(date: Date): { weekStart: string; dayOfWeek: number } {
  return {
    weekStart: formatWeekStart(mondayOf(date)),
    dayOfWeek: jsSundayToMonIndex(date.getDay()),
  };
}

export function calendarDateOf(weekStart: string, dayOfWeek: number): Date {
  return dayDateOf(weekStart, dayOfWeek);
}

export function storageWeeksForDisplayWeek(
  displayWeekStartIso: string,
  weekStartsOn: DayKey = 'monday',
): string[] {
  const seen = new Set<string>();
  const weeks: string[] = [];
  for (let i = 0; i < 7; i++) {
    const { weekStart } = storageCoords(dayDateOf(displayWeekStartIso, i));
    if (!seen.has(weekStart)) {
      seen.add(weekStart);
      weeks.push(weekStart);
    }
  }
  return weeks;
}

export function isoDate(value: string | Date): string {
  if (value instanceof Date) return formatWeekStart(value);
  return String(value).slice(0, 10);
}

/** Local calendar YYYY-MM-DD. Do not use toISOString() — that shifts the day east of UTC. */
export function localDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local calendar date of the given instant. Do not use toISOString() — that shifts the day east of UTC. */
export function formatWeekStart(date: Date): string {
  return localDateIso(date);
}

export function getThisMonday(now = new Date()): string {
  return formatWeekStart(mondayOf(now));
}

export function mondayOfWeek(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00`);
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const d = mondayOfWeek(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return localDateIso(d);
}

export function isThisWeek(weekStart: string, now = new Date(), weekStartsOn: DayKey = 'monday'): boolean {
  return weekStart === getThisDisplayWeek(weekStartsOn, now);
}

export function isNextWeek(weekStart: string, now = new Date(), weekStartsOn: DayKey = 'monday'): boolean {
  return weekStart === shiftWeek(getThisDisplayWeek(weekStartsOn, now), 1);
}

export function isPrevWeek(weekStart: string, now = new Date(), weekStartsOn: DayKey = 'monday'): boolean {
  return weekStart === shiftWeek(getThisDisplayWeek(weekStartsOn, now), -1);
}

export function formatShortWeek(weekStart: string): string {
  const mon = mondayOfWeek(weekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}

export function formatWeekLabel(weekStart: string, now = new Date(), weekStartsOn: DayKey = 'monday'): string {
  if (isThisWeek(weekStart, now, weekStartsOn)) return 'This week';
  if (isNextWeek(weekStart, now, weekStartsOn)) return 'Next week';
  return formatShortWeek(weekStart);
}

export function dayDateOf(weekStart: string, dayIndex: number): Date {
  const mon = mondayOfWeek(weekStart);
  const d = new Date(mon);
  d.setDate(mon.getDate() + dayIndex);
  return d;
}

export interface PlannerPostBody {
  planned_on: string;
  week_start: string;
  recipe_id: string;
  day_of_week: number;
  meal_type: 'dinner';
  servings: number;
}

/** Body the planner API expects. Date is source of truth; week fields stay in sync. */
export function buildPlannerPostBody(input: {
  weekStart: string;
  dayOfWeek: unknown;
  recipeId: string;
  servings?: number;
  plannedOn?: string;
}): PlannerPostBody {
  const day_of_week = parseDayOfWeek(input.dayOfWeek);
  if (day_of_week === null) {
    throw new Error('day_of_week must be 0–6 or a weekday name');
  }
  if (!input.weekStart || !input.recipeId) {
    throw new Error('week_start and recipe_id are required');
  }
  const planned_on = input.plannedOn ?? inferPlannedOn(input.weekStart, day_of_week);
  const coords = coordsFromPlannedOn(planned_on);
  return {
    planned_on,
    week_start: coords.weekStart,
    recipe_id: input.recipeId,
    day_of_week: coords.dayOfWeek,
    meal_type: 'dinner',
    servings: input.servings && input.servings > 0 ? input.servings : 4,
  };
}
