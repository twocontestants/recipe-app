export function missingStorageWeeks(
  needed: string[],
  cache: Map<string, unknown>,
): string[] {
  return needed.filter(week => !cache.has(week));
}

export function writeStorageWeek<T>(
  cache: Map<string, T[]>,
  week: string,
  meals: T[],
): void {
  cache.set(week, meals);
}

export function readStorageWeeks<T>(
  cache: Map<string, T[]>,
  weeks: string[],
): T[] {
  return weeks.flatMap(week => cache.get(week) ?? []);
}

export function invalidateStorageWeeks(
  cache: Map<string, unknown>,
  weeks: string[],
): void {
  for (const week of weeks) cache.delete(week);
}
