# Research: Planner picker search polish

## Decision 1 — Search icon layout

**Choice**: Put the magnifying-glass SVG in a flex row with the input as a sibling. Use `type="text"` plus `inputMode="search"` (and `enterKeyHint="search"`).

**Why**: Absolute positioning plus `input[type=search]` lets WebKit draw its own decoration and ignore padding-left, so the first typed character sits under our icon. A flex row cannot overlap. Dropping `type="search"` removes the native extra icon.

**Rejected**: Increasing `padding-left` on `type="search"` — UA styles still win on Safari. CSS `appearance: none` alone is brittle across iOS versions.

## Decision 2 — Keyboard gap and leftover space

**Choice**:
1. Dimmer stays a normal full-screen backdrop. It is not stretched (`200vh`) to paint over leftover space.
2. White sheet sized by `computePickerSheetBox(visual, layout, baselineVisualHeight, baselineInnerHeight)`:
   - If the visual viewport shrank by a keyboard-sized amount *and* there is a keyboard-sized hole below it, keep `height = visual.height` so the sheet does not sit under the keys.
   - If the layout viewport itself shrank by a keyboard-sized amount, fill to the current layout bottom (layout already excludes the keyboard).
   - Otherwise fill to the larger of the current layout bottom and the remembered inner height at picker open (chrome / URL-bar / body-lock gaps).
3. `keyboardOpen` when either of those keyboard cases is true. Keyboard-sized shrink is ≥ 200px (URL-bar shrink is smaller).

**Why**: A tall semi-transparent dimmer hid the gap without giving the list more room. Cooks still saw a short sheet and few recipes. Filling leftover space with the sheet itself shows more results and does not look like a hole in the overlay.

**Rejected**: Covering the gap with opacity only. Always filling to layout bottom while a keyboard overlays (content would sit under the keys).

## Decision 3 — Tests

**Choice**: Vitest. Pure tests for `computePickerSheetBox`. Component tests for `PickerSearchField` (icon not stacked on the input) and `PickerRecipeRow` (row tap vs rest-of-week vs another date).

**Why**: Vitest matches the TypeScript/React stack and can run in CI with `npm test`.

## Decision 4 — Add to this day, rest of week, or another date

**Choice**:
1. The result row tap adds dinner to the day the picker was opened for and closes the picker.
2. A kebab on the right opens **Add to…** with every other day of the displayed week (not the open day).
3. **Another date…** calls the native date picker (`input type="date"` / `showPicker`) so the cook can pick any calendar day, including another week. The Monday of that date plus weekday index are posted to the existing planner API.
4. Replace-mode only removes the open day’s meal when the chosen target is that same day in the same week.

**Why**: One tap for the obvious day; two taps for the rest of this week; a date picker for anything else. Reusing `week_start` + `day_of_week` avoids a new persistence model.

**Rejected**: Listing all seven days including the open day (redundant with the row tap). A custom calendar widget (native picker is enough on phones).
