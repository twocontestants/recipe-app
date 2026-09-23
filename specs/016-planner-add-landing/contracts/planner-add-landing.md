# Contract: planner add landing

Pure helpers used by the planner after a recipe-selector add.

```ts
export const ADD_LANDING_MS = 780;
export const ADD_LANDING_CLASS = 'is-landing';

export type AddLanding = {
  mealId: string;
  dayIndex: number;
  weekStartIso: string;
};

export function landingCardClass(
  mealId: string,
  landing: AddLanding | null,
  options?: { destinationVisible?: boolean },
): string;

export function shouldRevealDestinationWeek(
  currentWeekIso: string,
  targetWeekIso: string,
): boolean;

export function landingAfterPersist(
  landing: AddLanding | null,
  tempId: string,
  realId: string,
): AddLanding | null;

export function landingScrollOptions(reducedMotion: boolean): ScrollIntoViewOptions;
```

## Invariants

- `landingCardClass` is `ADD_LANDING_CLASS` only when `landing` is set, `mealId` matches, and `destinationVisible` is not `false`. Default `destinationVisible` to true so unit tests can omit it.
- `shouldRevealDestinationWeek` is true only when the two week-start day strings differ.
- `landingAfterPersist` returns a copy with `mealId: realId` when `landing.mealId === tempId`; otherwise it returns `landing` unchanged (including `null`).
- `landingScrollOptions` uses `behavior: 'smooth'` unless reduced motion, then `'auto'`. `block` and `inline` are `'nearest'`.
- Duration is under 1000ms.
