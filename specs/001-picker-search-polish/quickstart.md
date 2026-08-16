# Quickstart: picker search polish

## Run tests

```bash
npm install
npm test
```

Expected: Vitest passes `lib/pickerViewport.test.ts`, `components/PickerSearchField.test.tsx`, and `components/PickerRecipeRow.test.tsx`.

## Manual check (phone)

1. Open Planner → Add dinner.
2. Confirm the white sheet fills leftover space below/around the list (planner not showing through a dimmed gap) and that more than a handful of recipes are visible.
3. Tap Search recipes.
4. Type `p`. The letter must sit to the right of the magnifying glass, not under it.
5. Confirm there is no strip of the weekly planner visible between the white sheet and the keyboard.
6. Dismiss the keyboard; the sheet fills the screen again.
7. Tap a recipe. It is added to the day you opened the picker for.
8. Open another day’s picker, tap the three dots on a result: **Add to…** lists the other days of this week. Pick one.
9. Open the three dots again → **Another date…** and pick a day in another week. The recipe is saved for that date.
