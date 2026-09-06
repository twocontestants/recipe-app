import { mealOnDate } from './plannerDate';
import { dayDateOf, localDateIso } from './plannerDays';

export function sameDisplayWeek(a: string, b: string): boolean {
  return a === b;
}

export function displayWeekDateRange(weekStartIso: string): { from: string; to: string } {
  return {
    from: weekStartIso,
    to: localDateIso(dayDateOf(weekStartIso, 6)),
  };
}

export function notesByDisplayIndex(
  notesByIso: Record<string, string>,
  weekStartIso: string,
): Record<number, string> {
  const out: Record<number, string> = {};
  for (let i = 0; i < 7; i++) {
    const iso = localDateIso(dayDateOf(weekStartIso, i));
    const note = notesByIso[iso];
    if (note) out[i] = note;
  }
  return out;
}

export function hasMealRecipeMethod(meal: { recipe?: { ingredients?: unknown; steps?: unknown } }): boolean {
  return Array.isArray(meal.recipe?.ingredients) && Array.isArray(meal.recipe?.steps);
}

export function recipeCardMeta(input: {
  cookTime?: number | null;
  prepTime?: number | null;
  servings?: number | null;
}): string {
  const mins = input.cookTime && input.cookTime > 0
    ? input.cookTime
    : input.prepTime && input.prepTime > 0
      ? input.prepTime
      : null;
  const servings = input.servings && input.servings > 0 ? input.servings : null;
  const parts: string[] = [];
  if (mins) parts.push(`${mins} mins`);
  if (servings) parts.push(`${servings} serving${servings === 1 ? '' : 's'}`);
  return parts.join(' • ');
}

export function weekChipClass(opts: {
  planned: boolean;
  today?: boolean;
  selected?: boolean;
}): string {
  const parts = ['pl-chip'];
  parts.push(opts.planned ? 'is-planned' : 'is-empty');
  if (opts.today) parts.push('is-today');
  if (opts.selected) parts.push('is-selected');
  return parts.join(' ');
}

/** Days in the display week that already have a dinner. Caps at 7. */
export function countPlannedDays(
  meals: Array<{
    planned_on?: string | Date | null;
    week_start?: string | Date;
    day_of_week?: number;
    meal_type?: string;
  }>,
  weekStartIso: string,
): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const iso = localDateIso(dayDateOf(weekStartIso, i));
    if (meals.some(m => mealOnDate(m, iso) && m.meal_type === 'dinner')) {
      count += 1;
    }
  }
  return count;
}
