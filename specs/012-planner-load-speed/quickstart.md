# Quickstart: Faster planner load

## Prerequisites

- Postgres (`POSTGRES_URL`) with kitchen tables already created (`/api/setup` once).
- `npm install`

## Checks

1. Open Planner signed in. Network: one `GET /api/planner?from=&to=` per month covering this week (no extra `?weekStart=` on first paint). Nested recipes omit `ingredients` / `steps`. No cookbook GET until Add.
2. If week-start preference is already the day on screen, preferences finishing does not issue another meals GET.
3. Notes for the week arrive from one `GET /api/planner-notes?from=&to=`.
4. Open Add: `GET /api/recipes?includePublic=1` (cards). Picker is usable.
5. Generate a shopping list: ingredient lines are present.
6. Adjacent months may still prefetch after first paint.

## Tests

```bash
npm test
```

Expect coverage of week-start identity, notes mapping, and card vs full nested recipe (no live Postgres).
