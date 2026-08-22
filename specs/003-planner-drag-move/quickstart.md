# Quickstart: Planner drag-to-move

## Automated

```bash
npm test
```

Expect `lib/plannerDrag.test.ts` cases from `contracts/planner-drag.md` to pass.

## Manual

1. Open the planner with at least two dinners on different days.
2. Drag one onto another day — it should move; the destination day highlights while hovering.
3. Drag toward the top until **Previous week** appears; drop. The planner should show last week with the meal on the same weekday.
4. Repeat toward the bottom for **Next week**.
5. Tap a card without moving — the recipe opens.
6. Open the ☰ menu — no drag.
