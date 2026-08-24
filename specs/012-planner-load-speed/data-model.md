# Data model: Faster planner load

No new tables. Same `meal_plans` / `planner_notes` rows; two meal read shapes and one index.

## Planner meal card (grid)

Returned by `GET /api/planner`. Enough to draw a week card.

Meal fields: `id`, `planned_on`, `week_start`, `recipe_id`, `day_of_week`, `meal_type`, `servings`.

Nested `recipe` card fields: `id`, `title`, `description`, `image_url`, `source_url`, `servings`, `prep_time`, `cook_time`, `tags`, `primary_protein`, `owner_id`, `visibility`, `can_edit`.

Must **not** include recipe `ingredients` or `steps`.

## Planner meal detail (shopping)

Used by shopping-list POST via `getMealPlanForWeek`. Card plus `ingredients` and `steps`.

## Week notes (range)

`GET /api/planner-notes?from=&to=` (inclusive `YYYY-MM-DD`) returns a map of calendar day → note text. Display week is `from = week start`, `to = week start + 6 days`.

PUT remains `?weekStart=` plus `{ dayOfWeek, note }`.

## Index (meal_plans)

| Name | Definition | Serves |
|------|------------|--------|
| idx_meal_plans_week | `(week_start)` | existing |
| idx_meal_plans_planned_on | `(planned_on)` | existing |
| idx_meal_plans_owner_planned_on | `(owner_id, planned_on)` | “my week” list |

Created with `IF NOT EXISTS` after `planned_on` exists. Not from planner GET.

## Client load

- Meals: month range(s) covering the display week. No extra `?weekStart=` on first paint.
- Notes: one from/to GET. Map onto display-day indexes.
- Cookbook: loaded when the picker opens, not before first paint.
- Week-start preference: refetch meals only when the display week `YYYY-MM-DD` changes.
