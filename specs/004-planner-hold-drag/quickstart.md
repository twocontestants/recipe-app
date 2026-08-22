# Quickstart: Hold-drag rail

## Automated

```bash
npm test
```

Expect `lib/plannerDrag.test.ts` to cover hold timing, the ten-day window, occupancy, and rail-over-week hit-testing.

## Manual

1. Open `/planner` with at least one saved dinner.
2. Tap a card — the recipe opens; no rail.
3. Press a card and scroll — the week moves; no rail.
4. Hold a card ~half a second — the card lifts, a right-hand rail of ten dates appears (dotted empty, solid filled, titles on filled days).
5. Drop on another day this week — the meal moves.
6. Hold again and drop on a rail date outside this week — the planner jumps to that week with the meal there.
7. Hold and release on empty space — rail closes, meal stays.
8. Confirm no Previous week / Next week strip at the screen edges.
