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

export function todayDayIndex(now = new Date()): number {
  const d = now.getDay();
  return d === 0 ? 6 : d - 1;
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Match PlannerClient: local midnight formatted via ISO so both pages share a week key. */
export function formatWeekStart(date: Date): string {
  return date.toISOString().split('T')[0];
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
  return formatWeekStart(d);
}

export function isThisWeek(weekStart: string, now = new Date()): boolean {
  return weekStart === getThisMonday(now);
}

export function isNextWeek(weekStart: string, now = new Date()): boolean {
  return weekStart === shiftWeek(getThisMonday(now), 1);
}

export function formatShortWeek(weekStart: string): string {
  const mon = mondayOfWeek(weekStart);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${mon.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
}

export function formatWeekLabel(weekStart: string, now = new Date()): string {
  if (isThisWeek(weekStart, now)) return 'This week';
  if (isNextWeek(weekStart, now)) return 'Next week';
  return formatShortWeek(weekStart);
}

export function dayDateOf(weekStart: string, dayIndex: number): Date {
  const mon = mondayOfWeek(weekStart);
  const d = new Date(mon);
  d.setDate(mon.getDate() + dayIndex);
  return d;
}

export interface PlannerPostBody {
  week_start: string;
  recipe_id: string;
  day_of_week: number;
  meal_type: 'dinner';
  servings: number;
}

/** Body the planner API expects. Always emits an integer day so Postgres CHECK passes. */
export function buildPlannerPostBody(input: {
  weekStart: string;
  dayOfWeek: unknown;
  recipeId: string;
  servings?: number;
}): PlannerPostBody {
  const day_of_week = parseDayOfWeek(input.dayOfWeek);
  if (day_of_week === null) {
    throw new Error('day_of_week must be 0–6 or a weekday name');
  }
  if (!input.weekStart || !input.recipeId) {
    throw new Error('week_start and recipe_id are required');
  }
  return {
    week_start: input.weekStart,
    recipe_id: input.recipeId,
    day_of_week,
    meal_type: 'dinner',
    servings: input.servings && input.servings > 0 ? input.servings : 4,
  };
}
