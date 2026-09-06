# Contract: Insights tab and payload

Cookie `mise_session` required (same as Planner).

## Navigation (UI)

Signed-in kitchen nav: Recipes, Planner, Shopping, **Insights**, Settings.

- Label: `Insights`
- href: `/insights`
- Active when the path starts with `/insights`
- Guests: item omitted; `/insights` uses `AuthGate` (redirect to `/login?next=/insights`)

## GET /api/insights

Query:

| Param | Required | Meaning |
|-------|----------|---------|
| preset | no | `this-week` \| `last-4` \| `last-12` \| `all-time`. Default `last-12` |
| from | no | Kitchen day start. If set, `to` is required and `preset` is ignored |
| to | no | Kitchen day end (inclusive) |
| weekStartDay | no | `monday`…`sunday`. If omitted, server reads the cook’s `weekStartDay` preference (default Monday) |

Rules:

- Unauthenticated → `401` `{ "error": "Sign in required" }`
- Invalid day strings or `from > to` → `400`
- Inclusive span > 800 days → `400` `{ "error": "date range is too long" }`
- Results MUST be `WHERE owner_id = signed-in user` only
- MUST NOT run CREATE/ALTER
- MUST NOT include ingredients, steps, notes, or other cooks’ ratings

Success `200`:

```json
{
  "preset": "last-12",
  "weekStartDay": "monday",
  "from": "2026-06-08",
  "to": "2026-08-30",
  "pulse": {
    "dinnersPlanned": 18,
    "nightsWithDinner": 16,
    "distinctRecipes": 11,
    "streak": 3
  },
  "cadence": [
    { "weekStart": "2026-06-08", "dinners": 2 }
  ],
  "proteinMix": [
    { "protein": "chicken", "dinners": 8, "share": 0.4444 },
    { "protein": "unlabelled", "dinners": 1, "share": 0.0556 }
  ],
  "ranking": [
    { "recipeId": "…", "title": "Tacos", "count": 3, "available": true }
  ],
  "cards": [
    {
      "id": "dominant-protein",
      "kind": "dominant-protein",
      "text": "Chicken was 44% of dinners.",
      "protein": "chicken"
    }
  ],
  "otherMealCount": 0
}
```

Empty kitchen (zero dinners in range): `pulse` all zeros, `cadence` still lists each week at 0, `proteinMix` `[]`, `ranking` `[]`, `cards` `[]`. The page shows the empty state instead of mix/ranking/cards.

## Planner deep link (UI)

`GET /planner?week=YYYY-MM-DD`

- `week` is a display-week start (kitchen day).
- If present and a valid day string, Planner shows that display week (snapped with `startOfDisplayWeek` using the cook’s week-start).
- Invalid or absent `week`: today’s display week (current behaviour).

## Recipe open (UI)

Available ranking/card rows link with the existing recipe view path. `available: false` rows are not links.

## Client GET

Insights page: one `GET /api/insights?preset=…` after preferences are known (so `weekStartDay` matches Settings). MAY omit `weekStartDay` and let the server read the preference.

Failed GET: error + retry; MUST drop any previously rendered view model.
