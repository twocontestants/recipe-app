export const ADD_LANDING_MS = 780;
export const ADD_LANDING_CLASS = 'is-landing';
export const ADD_LANDING_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export type AddLanding = {
  mealId: string;
  dayIndex: number;
  weekStartIso: string;
};

export function landingCardClass(
  mealId: string,
  landing: AddLanding | null,
  options?: { destinationVisible?: boolean },
): string {
  if (!landing || landing.mealId !== mealId) return '';
  if (options?.destinationVisible === false) return '';
  return ADD_LANDING_CLASS;
}

export function shouldRevealDestinationWeek(
  currentWeekIso: string,
  targetWeekIso: string,
): boolean {
  return currentWeekIso !== targetWeekIso;
}

export function landingAfterPersist(
  landing: AddLanding | null,
  tempId: string,
  realId: string,
): AddLanding | null {
  if (!landing || landing.mealId !== tempId) return landing;
  return { ...landing, mealId: realId };
}

export function landingScrollOptions(reducedMotion: boolean): ScrollIntoViewOptions {
  return {
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'nearest',
  };
}

export function prefersReducedAddLanding(
  matchMedia?: (query: string) => { matches: boolean } | null,
): boolean {
  return Boolean(matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}
