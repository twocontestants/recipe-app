import { mealOnIso } from './plannerDrag';
import {
  dayDateOf,
  localDateIso,
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
  return localDateIso(startOfDisplayWeek(parseLocalIso(iso), weekStartsOn));
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
  for (let index = 0; index < 7; index++) {
    const iso = localDateIso(dayDateOf(displayWeekStart, index));
    for (const raw of plans) {
      if (!raw || typeof raw !== 'object') continue;
      const plan = raw as {
        week_start?: string | Date;
        day_of_week?: unknown;
        meal_type?: string;
        recipe?: { title?: string | null } | null;
      };
      const day = parseDayOfWeek(plan.day_of_week);
      if (day === null || plan.week_start == null) continue;
      if (!mealOnIso({
        week_start: plan.week_start,
        day_of_week: day,
        meal_type: plan.meal_type,
        recipe: plan.recipe,
      }, iso)) continue;
      if (!map[index]) map[index] = [];
      map[index].push({
        title: plan.recipe?.title?.trim() || 'Meal',
        meal_type: plan.meal_type || 'dinner',
      });
    }
  }
  return map;
}

export function isRailOrigin(iso: string, originIso: string): boolean {
  return iso === originIso;
}
