# Quickstart: Unified shopping list items

## Prerequisites

- Signed-in household with at least one saved shopping list (or generate from planned dinners).
- `npm test` for helper coverage; browser for the cook-facing path.

## Automated

```bash
npm test
```

Expect migrate/fold tests to:

- Copy leftover `custom_items` onto `items` with `custom: true`.
- Copy leftover `checked_state` onto `item.checked` as a boolean (name keys remap to ids).
- Drop `checkedBy` / `checkedAt`.
- Leave meta SELECT without item bodies.

## Manual

1. Open Shopping. Dropdown still loads names only; the open list shows lines.
2. Tick two lines, reload. Those two stay ticked. No who/when on the line.
3. Add a hand-typed line, tick it, rename it, reload. It is still there and ticked, among the recipe lines.
4. If an older list still has split extras/ticks in the database, open it once: extras and ticks appear; a second reload still shows them.
5. Two browsers on the same list: tick in one; the other updates. Reload both; ticks match.

## Out of scope here

Aisle labels, drag-to-aisle, recipe pills, and generate-from-weeks behaviour stay as they are.
