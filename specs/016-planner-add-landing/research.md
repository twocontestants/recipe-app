# Research: Planner add-landing animation

## Decision 1 — Close the selector before the save resolves

**Decision**: `setPicker(null)` runs in the same turn as the optimistic meal insert, before `await fetch`.

**Rationale**: Today `pickRecipeForDay` awaits `addMeal`, which waits for POST even though same-week adds already mutate local state first. That is why the selector stays up. The spec requires it gone without waiting.

**Alternatives considered**: Keep waiting for POST (honest but slow on a kitchen phone); fade the overlay until POST returns (still blocks seeing the week).

## Decision 2 — CSS class on the meal card, not a FLIP flight

**Decision**: After close, the new `.pl-recipe-card` gets `is-landing` for `ADD_LANDING_MS` (~780ms): a short opacity/translate/scale settle and a soft ring. `prefers-reduced-motion: reduce` keeps the ring and drops movement.

**Rationale**: Constitution simplicity; no extra library. A flight from the picker row to the day needs shared geometry and fights the overlay unmount.

**Alternatives considered**: Clone the picker row and animate it to the day (more “show where”); a toast only (fails “show where”).

## Decision 3 — Reveal the destination week

**Decision**: If the target week start ISO differs from the week on screen, navigate there (existing week shift / jump) and land on that day. Same-week adds only scroll the destination day into view.

**Rationale**: Spec story 3. Toast-only off-week adds hide the landing.

**Alternatives considered**: Keep toast-only for other weeks (smaller change, misses the request).

## Decision 4 — Landing key is meal id, swapped on persist

**Decision**: Highlight by meal plan id. Optimistic inserts use `tmp-…`. When POST returns, map landing id from temp to real so the cue survives the swap. Failed save clears landing.

**Rationale**: Two copies of the same recipe on one day must not both pulse. Recipe id + date would light every match.

**Alternatives considered**: Highlight the whole day; highlight by recipe id.
