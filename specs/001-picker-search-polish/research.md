# Research: Planner picker search polish

## Decision 1 — Search icon layout

**Choice**: Put the magnifying-glass SVG in a flex row with the input as a sibling. Use `type="text"` plus `inputMode="search"` (and `enterKeyHint="search"`).

**Why**: Absolute positioning plus `input[type=search]` lets WebKit draw its own decoration and ignore padding-left, so the first typed character sits under our icon. A flex row cannot overlap. Dropping `type="search"` removes the native extra icon.

**Rejected**: Increasing `padding-left` on `type="search"` — UA styles still win on Safari. CSS `appearance: none` alone is brittle across iOS versions.

## Decision 2 — Keyboard gap

**Choice**:
1. Full-screen dimmer (`position: fixed; inset: 0`) so planner never shows through.
2. White sheet sized by `computePickerSheetBox(visual, layout, baseline)`:
   - Default: `top = offsetTop`, `height = visual.height`.
   - If space below the visual viewport (`layout.innerHeight - offsetTop - visual.height`) is greater than 0 and less than 150px, treat it as chrome mismatch (layout already excludes the keyboard) and extend `height` to `layout.innerHeight - offsetTop`.
   - If space below is ≥ 150px, treat it as an overlaying keyboard and keep `height = visual.height`.
3. `keyboardOpen` when the used height is ≥ 120px shorter than the pre-keyboard baseline.

**Why**: iOS/Android sometimes shrink `innerHeight` with the keyboard while `visualViewport.height` is still shorter (URL bar / safe area), leaving a 40–90px page strip. Overlay keyboards report ~250–400px of space below; those must not be filled or the sheet would sit under the keys.

**Rejected**: `bottom: 0` on the layout viewport (slides under the keyboard). Guessing a constant accessory-bar height.

## Decision 3 — Tests

**Choice**: Vitest. Pure tests for `computePickerSheetBox`. Component tests for `PickerSearchField` asserting the icon is not stacked on the input (`position` not absolute over the field) and the input is not `type="search"`.

**Why**: The repo has no test runner. Vitest matches the TypeScript/React stack and can run in CI with `npm test`.
