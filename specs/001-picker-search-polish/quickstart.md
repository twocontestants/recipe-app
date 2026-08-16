# Quickstart: picker search polish

## Run tests

```bash
npm install
npm test
```

Expected: Vitest passes `lib/pickerViewport.test.ts` and `components/PickerSearchField.test.tsx`.

## Manual check (phone)

1. Open Planner → Add dinner.
2. Tap Search recipes.
3. Type `p`. The letter must sit to the right of the magnifying glass, not under it.
4. Confirm there is no strip of the weekly planner visible between the white sheet and the keyboard.
5. Dismiss the keyboard; the sheet fills the screen again.
