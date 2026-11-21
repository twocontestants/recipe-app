import { mealOnDate } from './plannerDate';
import {
  dayDateOf,
  formatWeekLabel,
  getThisDisplayWeek,
  localDateIso,
  parseDayOfWeek,
  parseLocalIso,
  shiftWeek,
  storageCoords,
  type DayKey,
} from './plannerDays';

export interface GenerateListMeal {
  key: string;
  id?: string;
  recipe_id: string;
  recipe_title: string;
  day_of_week: number;
  week_start: string;
  planned_on: string;
}

/** Last / this / next display week, plus a planner week that sits outside that window. */
export function generateListWeeks(
  weekStartsOn: DayKey,
  defaultWeekStart?: string,
  now = new Date(),
): string[] {
  const thisWeek = getThisDisplayWeek(weekStartsOn, now);
  const weeks = new Set([
    shiftWeek(thisWeek, -1),
    thisWeek,
    shiftWeek(thisWeek, 1),
  ]);
  if (defaultWeekStart) weeks.add(defaultWeekStart);
  return [...weeks].sort();
}

export function generateListDateRange(weeks: string[]): { from: string; to: string } {
  const from = weeks[0] ?? localDateIso(new Date());
  const last = weeks[weeks.length - 1] ?? from;
  return { from, to: localDateIso(dayDateOf(last, 6)) };
}

export function generateListFromCache(
  plans: readonly unknown[],
  weekStartsOn: DayKey,
  defaultWeekStart?: string,
  now = new Date(),
): { meals: Record<string, GenerateListMeal[]>; selected: string[] } {
  const thisWeek = getThisDisplayWeek(weekStartsOn, now);
  const weeks = generateListWeeks(weekStartsOn, defaultWeekStart, now);
  const meals = mealsByWeekFromPlans(plans, weeks);
  return {
    meals,
    selected: defaultSelectedMealKeys(
      meals,
      defaultWeekStart ?? thisWeek,
      thisWeek,
      localDateIso(now),
    ),
  };
}

export function mealsByWeekFromPlans(
  plans: readonly unknown[],
  weeks: string[],
): Record<string, GenerateListMeal[]> {
  const map: Record<string, GenerateListMeal[]> = {};
  for (const wk of weeks) {
    const entries: GenerateListMeal[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = dayDateOf(wk, dayIndex);
      const coords = storageCoords(day);
      const iso = localDateIso(day);
      for (const raw of plans) {
        if (!raw || typeof raw !== 'object') continue;
        const plan = raw as {
          id?: string;
          recipe_id?: string;
          recipe?: { title?: string };
          day_of_week?: unknown;
          week_start?: string;
          planned_on?: string;
        };
        const storedDay = parseDayOfWeek(plan.day_of_week);
        if (!plan.recipe_id) continue;
        if (!mealOnDate(plan, iso)) continue;
        const id = typeof plan.id === 'string' && plan.id ? plan.id : undefined;
        entries.push({
          key: mealEntryKey({ id, planned_on: iso, recipe_id: plan.recipe_id }, entries.length),
          id,
          recipe_id: plan.recipe_id,
          recipe_title: plan.recipe?.title ?? 'Unknown',
          day_of_week: storedDay ?? coords.dayOfWeek,
          week_start: coords.weekStart,
          planned_on: iso,
        });
      }
    }
    map[wk] = entries;
  }
  return map;
}

/**
 * Always show this week (and the planner week the cook opened from).
 * Hide last / next when nothing is planned.
 */
export function visibleGenerateListWeeks(
  weeks: string[],
  mealsByWeek: Record<string, { length: number }>,
  thisWeek: string,
  defaultWeekStart?: string,
): string[] {
  return weeks.filter(wk => {
    if (wk === thisWeek) return true;
    if (defaultWeekStart && wk === defaultWeekStart) return true;
    return (mealsByWeek[wk]?.length ?? 0) > 0;
  });
}

export function shouldDefaultSelectMeal(
  mealWeek: string,
  plannedOn: string,
  defaultWeek: string,
  thisWeek: string,
  todayIso: string,
): boolean {
  if (mealWeek !== defaultWeek) return false;
  if (defaultWeek === thisWeek && plannedOn < todayIso) return false;
  return true;
}

export function defaultSelectedMealKeys(
  mealsByWeek: Record<string, Array<{ key: string; planned_on: string }>>,
  defaultWeek: string,
  thisWeek: string,
  todayIso: string,
): string[] {
  return (mealsByWeek[defaultWeek] ?? [])
    .filter(m => shouldDefaultSelectMeal(defaultWeek, m.planned_on, defaultWeek, thisWeek, todayIso))
    .map(m => m.key);
}

export function mealEntryKey(
  meal: { id?: string; planned_on: string; recipe_id: string },
  index: number,
): string {
  if (meal.id) return meal.id;
  return `${meal.planned_on}::${meal.recipe_id}::${index}`;
}

/** e.g. "Sat 12 Sep" so this Thursday and next Thursday stay distinct. */
export function mealDayLabel(plannedOn: string): string {
  return parseLocalIso(plannedOn).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function generateListWeekTag(
  weekStart: string,
  weekStartsOn: DayKey,
  prevWeek: string,
  now = new Date(),
): string {
  const label = formatWeekLabel(weekStart, now, weekStartsOn);
  if (label === 'This week') return 'this week';
  if (label === 'Next week') return 'next week';
  if (weekStart === prevWeek) return 'last week';
  return label;
}
