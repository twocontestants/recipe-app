# Research: Flexible week start setting

## Decision 1 — What “week start date” means

**Decision**: A household weekday (any of seven). Default Monday.

**Rationale**: The planner is a repeating seven-day grid. Cooks who said “flexible” need Sunday (or another day), not a one-off calendar date. A single arbitrary date would break “this week / next week” forever after.

**Alternatives considered**:
- Date picker for “this plan starts on 25 Aug” — one-shot, does not recur, out of scope per spec assumptions.
- Only Sat / Sun / Mon — not flexible enough.

## Decision 2 — Storage vs display

**Decision**: Keep `meal_plans.week_start` as the Monday of the calendar week and `day_of_week` 0–6 as Monday–Sunday. Display weeks are computed from the setting; writes convert the chosen calendar date back to those coordinates.

**Rationale**: Existing rows already use that shape. Remapping on every setting change would risk losing dinners. A display week that is not Monday–Sunday may overlap two stored Monday weeks; the client fetches both.

**Alternatives considered**:
- Store `week_start` as the configured first day and remigrate on change — fragile for a household DB.
- Store an absolute date per meal — larger schema change than this feature needs.

## Decision 3 — Where the setting lives

**Decision**: `app_settings` key `weekStartDay`, exposed on `GET`/`PUT /api/preferences` next to `categoryPrefMode`. Settings page gets a second preference row.

**Rationale**: Household-wide settings already use this table and route. No new table or auth model.

**Alternatives considered**:
- `localStorage` only — would not follow the cook across devices.
- New `/api/week-start` route — unnecessary split.

## Decision 4 — Invalid values

**Decision**: Unknown or missing values read as `monday`. PUT rejects anything that is not a weekday name (400); the previous value remains.

**Rationale**: Matches the category-pref fallback pattern and FR-007 / FR-008.
