# Data model: Analytics and Insights

No new tables. Insights is a read model over the signed-in cook’s existing kitchen.

## Source rows (unchanged)

### Dinner candidate (`meal_plans`)

| Field | Meaning |
|-------|---------|
| owner_id | Cook whose kitchen this is |
| planned_on | Kitchen day `YYYY-MM-DD` |
| meal_type | `dinner` (or empty) vs breakfast/lunch/other |
| recipe_id | Planned recipe |
| servings | Unused by Insights v1 |

### Recipe card fields used

| Field | Meaning |
|-------|---------|
| id | Ranking / card identity |
| title | Display name; fallback “Unavailable recipe” when the join misses |
| primary_protein | Mix bucket; null → Unlabelled |

### Personal rating (`recipe_ratings`)

| Field | Meaning |
|-------|---------|
| user_id | Same cook |
| recipe_id | Recipe they rated |
| stars | 1–5; 4–5 qualify for neglected-high-rating cards |

## Compact dinner event (query result → aggregator)

One row per planned meal in `[from, to]` plus, for missing-protein cards, the cook’s last dinner `planned_on` per protein **before** `from`.

| Field | Rule |
|-------|------|
| planned_on | Day string |
| meal_type | As stored |
| recipe_id | May be dangling if the recipe was deleted |
| title | Joined title or null |
| primary_protein | Joined value or null |
| is_dinner | `meal_type` is null, `''`, or `'dinner'` (case-insensitive) |

Deleted recipes still produce a dinner event. Ranking uses title fallback. Tap is disabled when title is missing / recipe gone.

## Kitchen window

Resolved in `lib/insightsWindow.ts` from preset, today, and `weekStartDay`:

| Preset | `from` | `to` |
|--------|--------|------|
| this-week | current display-week start | that week’s 7th day |
| last-4 | display-week start 3 weeks before this week | end of this week |
| last-12 (default) | display-week start 11 weeks before this week | end of this week |
| all-time | oldest dinner `planned_on` for owner, or this-week `from` if none | end of this week |

All values are kitchen day strings. Cadence iterates display weeks from `from`’s week through `to`’s week inclusive (pad `from` back to week start so the first bar is a full kitchen week).

## View model (API body)

### Pulse

| Field | Rule |
|-------|------|
| dinnersPlanned | Count of dinner events in window |
| nightsWithDinner | Distinct `planned_on` among dinners |
| distinctRecipes | Distinct `recipe_id` among dinners |
| streak | Consecutive kitchen days with ≥1 dinner, walking backward from min(today, `to`) |

Streak does not require a dinner tomorrow. If today has no dinner, streak ends at the most recent past day that has one only if every day from that day through yesterday also has one — i.e. standard consecutive-day walk ending at the latest day ≤ today that is part of an unbroken run.

### Cadence

Array of `{ weekStart, dinners }` for each display week in the padded window. `weekStart` is the display-week start day string. Weeks with zero dinners are present.

### Protein mix

Array of `{ protein, dinners, share }` sorted by dinners descending, then protein name. `protein` is a vocabulary key or `unlabelled`. `share` is dinners / dinnersPlanned (0 when no dinners). Vocabulary is the existing ProteinType list.

### Ranking

Top 10 `{ recipeId, title, count, available }`. `available` is false when the recipe cannot be opened. Sorted by count desc, title asc.

### Insight cards

`{ id, kind, text, recipeId?, protein? }` with `kind` one of `dominant-protein` | `missing-protein` | `repeat-dish` | `neglected-rating`. At most four. See research.md for qualification rules.

### Other

`otherMealCount`: non-dinner events in window (note only).

`from` / `to` / `preset` / `weekStartDay` echoed so the client does not re-derive the window.

## State

Insights is read-only. No transitions. Changing a dinner on the Planner is visible on the next Insights GET (no live socket required for v1).

## Validation

- `from`/`to` MUST be `YYYY-MM-DD` with `from ≤ to`.
- Inclusive span MUST be ≤ 800 days (All time guard). Longer history still uses All time semantically by clamping `from` forward to `to - 799` days after snapping to a display-week start — documented on the contract. Prefer loading oldest dinner so typical households never hit the cap.
- Unknown preset → default `last-12`.
- Owner filter is mandatory; never return another cook’s events.
