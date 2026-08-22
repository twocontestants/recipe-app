# Research: Planner hold-to-drag with day rail

## Hold vs instant drag

- **Decision**: 400ms hold; 8px movement before the hold fires cancels it. Pointer capture starts only after the hold arms.
- **Rationale**: Instant drag plus `touch-action: none` on every card made the list feel broken. Native long-press (iOS ~500ms, Material 400–500ms) is the kitchen-phone pattern. Cancelling on early movement lets the week scroll.
- **Alternatives considered**: Instant drag (rejected — current “scuffed” behavior). HTML5 DnD (rejected — poor iOS). Context-menu long-press without a drag (rejected — user asked to drag onto dates).

## Ten-day window

- **Decision**: Four calendar days before the meal’s date, that date, five days after. Occupancy uses dinners already planned on each date (including the meal being held).
- **Rationale**: “Surrounding ten days” with a slight bias toward the future matches leftover / “move it later this week” jobs. Including the origin keeps the rail a continuous timeline.
- **Alternatives considered**: Current week only (rejected — no cross-week move). Previous/Next week edge strips (rejected by the user). Ten days around today regardless of the meal (rejected — holding a meal next week should show *that* neighbourhood).

## Hit-testing

- **Decision**: Use full boxes (x and y). If the pointer is over a rail day, that wins. Else if it is over a week-day row, that wins. Else cancel on release. No top/bottom edge bands.
- **Rationale**: The rail overlays the right side; Y-only hit-test would steal drops from week rows at the same height.
- **Alternatives considered**: Y-only resolve (rejected). Edge bands (rejected).

## Rail data

- **Decision**: When the hold arms, fetch planner weeks that cover the ten dates and merge with the week already on screen. Preview titles come from those meals.
- **Rationale**: Days outside the open week would otherwise look empty. Fetching on hold (not on every page load) keeps the idle planner cheap.
- **Alternatives considered**: Only show meals already in `mealPlans` (rejected — lying empty circles). Prefetch ±2 weeks always (unnecessary traffic).
