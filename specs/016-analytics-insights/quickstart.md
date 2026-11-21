# Quickstart: Analytics and Insights tab

## Prerequisites

- Postgres (`POSTGRES_URL`) with kitchen tables (`/api/setup` once).
- A signed-in cook with at least a few dinners across more than one week (and a second cook with none, for the privacy check).
- `npm install`

## Checks

1. Signed in: kitchen nav shows Insights after Shopping. Signed out: Insights is absent; `/insights` asks for sign-in.
2. Open Insights: one `GET /api/insights?preset=last-12`. Network body is the view model in [contracts/insights.md](./contracts/insights.md) — no ingredients/steps. Pulse numbers match a manual count of dinners in that window (see [data-model.md](./data-model.md)).
3. Cadence bars: one per kitchen week including zeros; tap a bar → Planner that week (`/planner?week=…`). Protein mix shares sum to 1 (± rounding) of dinners; tap a row shows count and share in words.
4. Switch This week / Last 4 weeks / All time: every pulse number and both charts change; no leftover previous preset.
5. Empty window (second cook, or a preset with no dinners): empty state with a path to Planner — not a hollow mix chart with fake cards.
6. Insight cards (fixture kitchen): dominant protein, gap, repeat, neglected high rating only when those rules qualify; copy is factual.
7. Phone-width: charts readable above the bottom tab bar; no hover-only values.

## Tests

```bash
npm test
```

Expect coverage of window presets, dinner filtering, pulse/streak, cadence buckets, protein mix, ranking, card thresholds, and chart scale helpers (no live Postgres required for those). Sidebar includes Insights only when signed in.
