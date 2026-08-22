import {
  calendarDateOf,
  displayDayIndex,
  formatWeekStart,
  isoDate,
  parseDayOfWeek,
  parseLocalIso,
  shiftWeek,
  startOfDisplayWeek,
  type DayKey,
} from './plannerDays';

export interface SheetMeal {
  title: string;
  meal_type: string;
}

export interface SheetAnchor {
  weekStart: string;
  selectedDay: number;
}

export function displayWeekOf(iso: string, weekStartsOn: DayKey): string {
  return formatWeekStart(startOfDisplayWeek(parseLocalIso(iso), weekStartsOn));
}

export function sheetAnchorForRailPick(
  direction: 'earlier' | 'later',
  originIso: string,
  weekStartsOn: DayKey = 'monday',
): SheetAnchor {
  const originWeek = displayWeekOf(originIso, weekStartsOn);
  if (direction === 'earlier') {
    return { weekStart: shiftWeek(originWeek, -1), selectedDay: 6 };
  }
  return { weekStart: shiftWeek(originWeek, 1), selectedDay: 0 };
}

export function weekPlanFromMeals(
  plans: readonly unknown[],
  displayWeekStart: string,
  weekStartsOn: DayKey = 'monday',
): Record<number, SheetMeal[]> {
  const map: Record<number, SheetMeal[]> = {};
  for (const raw of plans) {
    if (!raw || typeof raw !== 'object') continue;
    const plan = raw as {
      week_start?: string | Date;
      day_of_week?: unknown;
      meal_type?: string;
      recipe?: { title?: string | null } | null;
    };
    const storedDay = parseDayOfWeek(plan.day_of_week);
    if (storedDay === null || plan.week_start == null) continue;
    const cal = calendarDateOf(isoDate(plan.week_start), storedDay);
    if (isoDate(startOfDisplayWeek(cal, weekStartsOn)) !== displayWeekStart) continue;
    const display = displayDayIndex(cal, weekStartsOn);
    if (!map[display]) map[display] = [];
    map[display].push({
      title: plan.recipe?.title?.trim() || 'Meal',
      meal_type: plan.meal_type || 'dinner',
    });
  }
  return map;
}

export function isRailOrigin(iso: string, originIso: string): boolean {
  return iso === originIso;
}
