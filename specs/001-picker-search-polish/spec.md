# Feature Specification: Planner picker search polish

**Feature Branch**: `cursor/picker-fill-and-add-to-day-ffdc`

**Created**: 2026-08-16

**Status**: Implemented

**Input**: User description: "The magnifying glass symbol appears over the first character of text when typing. There is a noticeable gap between the keyboard and the bottom of the modal so I can see the content underneath." Later: fill leftover space with the sheet itself (not a dimmer); tapping a search result adds it to that day; a three-dot menu adds it to the rest of the week or another date.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Typed search text stays clear of the icon (Priority: P1)

A cook opens the planner recipe picker and types a recipe name. The magnifying-glass decoration stays beside the field. Every character they type is fully visible and never sits under the icon.

**Why this priority**: Overlapping text makes search unusable; this is the first thing they notice while typing.

**Independent Test**: Open the picker, type at least one character, and confirm the first character is not covered by the search icon.

**Acceptance Scenarios**:

1. **Given** the recipe picker is open with an empty search field, **When** the user types "pasta", **Then** each letter is fully visible to the right of the magnifying-glass icon with a clear gap between icon and text.
2. **Given** the search field already contains text, **When** the user continues typing or places the caret at the start, **Then** the icon still does not cover any character.

---

### User Story 2 - Sheet fills leftover space (Priority: P1)

A cook opens the recipe picker on a phone. The white sheet occupies the leftover visible area (chrome, URL-bar, and body-lock gaps included). They can see as many recipes as that space allows. No strip of the planner shows through under or beside the sheet, and leftover space is not merely painted over with a see-through dimmer.

When they tap search and the keyboard appears, the sheet meets the top of the keyboard. The list shrinks so search stays visible. Dismissing the keyboard restores a full-height sheet.

**Why this priority**: A short sheet hides most of the library; a transparent gap still looks like the picker does not own the screen.

**Independent Test**: On a phone-sized viewport, open the picker with leftover space below the visual area and confirm the white sheet occupies that space (planner not visible through it). Focus search so a keyboard-sized inset appears and confirm there is no uncovered page content between the sheet bottom and the keyboard top.

**Acceptance Scenarios**:

1. **Given** the recipe picker is open on a phone with leftover chrome or URL-bar space, **When** the cook views the list, **Then** the white sheet fills that leftover space so more recipes are visible, and the planner is not showing through a gap.
2. **Given** the recipe picker is open on a phone, **When** the user focuses the search field and the keyboard occupies the lower part of the screen, **Then** the picker sheet’s bottom edge meets the visible area above the keyboard with no page content showing in between.
3. **Given** the keyboard is open, **When** the user types and the result list shrinks, **Then** the sheet still fills the remaining visible area and does not leave a gap above the keyboard.
4. **Given** the keyboard is dismissed, **When** the picker remains open, **Then** the sheet returns to filling the visible screen without a leftover empty band.

---

### User Story 3 - Add a recipe to this day or another day (Priority: P1)

A cook opens Add dinner for a specific day (for example Wednesday). Tapping a recipe in the search list adds it to that day and closes the picker.

A three-dot control on the right of each result opens **Add to…**. That menu lists the rest of the week they are viewing (the other days, not the day already open). **Another date…** opens a date picker so they can add the same recipe to any other calendar day, including a different week.

**Why this priority**: The picker is how meals get onto the plan; cooks need a one-tap add for the open day and a way to park the same recipe on another day without leaving search.

**Independent Test**: Open the picker for Monday. Tap a recipe and confirm it lands on Monday. Open the three-dot menu on another recipe, pick Tuesday, and confirm it lands on Tuesday. Choose Another date, pick a day in a later week, and confirm it is saved for that date.

**Acceptance Scenarios**:

1. **Given** the picker was opened for a day, **When** the cook taps a recipe row, **Then** that recipe is added as dinner for that day and the picker closes.
2. **Given** the three-dot menu is open, **When** the cook views **Add to…**, **Then** they see the other days of the currently displayed week and do not see the day the picker was opened for (that day is the row tap).
3. **Given** the three-dot menu is open, **When** the cook chooses another day of this week, **Then** the recipe is added to that day and the picker closes.
4. **Given** the three-dot menu is open, **When** the cook chooses **Another date…** and picks a calendar date, **Then** the recipe is added to that date (including a different week) and the picker closes.
5. **Given** the cook opened the picker to replace an existing meal, **When** they tap a recipe row, **Then** the open day’s meal is replaced. **When** they add to a different day or date via the menu, **Then** the open day’s meal is left in place and the recipe is added to the chosen day.

---

### Edge Cases

- Very short keyboards or accessory bars (autocomplete) must not leave a page-content strip between sheet and keys.
- Landscape phones, where the visible area above the keyboard is short, still keep the search field visible and unobstructed.
- Desktop and tablet pointing devices (no on-screen keyboard) keep the existing centered picker; no keyboard-gap logic should punch a hole in the sheet.
- Empty search results still occupy the same sheet; only the list contents change.
- Opening **Add to…** on the last day of the displayed week still lists the earlier days of that week plus **Another date…**.
- Picking **Another date…** that falls on the currently displayed week behaves the same as choosing that weekday from the list.
- Adding to a week the cook is not currently viewing still succeeds; they are told which date it was added to.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The search icon MUST sit beside the typed value, never overlapping it, including the first character.
- **FR-002**: Focusing the search field on a device with an on-screen keyboard MUST keep the picker sheet flush with the top of the remaining visible area (no uncovered planner/page strip between sheet and keyboard).
- **FR-003**: While the keyboard is open, the recipe list MUST shrink inside the sheet so search remains visible at the bottom of the sheet.
- **FR-004**: Leftover visible space around the picker (chrome, URL-bar, body-lock gaps) MUST be filled by the white sheet itself so more recipes can be shown. A dimmer MUST NOT be used as the way to hide those gaps.
- **FR-005**: Dismissing the keyboard MUST restore the sheet to the full visible area without a persistent gap.
- **FR-006**: Automated tests MUST cover icon-vs-text layout rules, the viewport-box math that sizes the sheet, and add-to-day / another-date menu behavior.
- **FR-007**: Tapping a recipe in the search list MUST add it as dinner for the day the picker was opened for, then close the picker.
- **FR-008**: Each search result MUST offer a three-dot control that opens an **Add to…** menu of the rest of the currently displayed week (every day except the open day).
- **FR-009**: The **Add to…** menu MUST include an **Another date…** action that lets the cook pick any calendar date and add the recipe there.
- **FR-010**: Adding via the three-dot menu MUST NOT replace the open day’s meal unless the chosen day is that same day in the same week.

### Key Entities

- **Picker sheet**: The white recipe-search panel (header, scrollable results, search field).
- **Visible viewport**: The portion of the screen the user can see once the keyboard is accounted for.
- **Search field**: The text entry at the bottom of the sheet, with a decorative magnifying-glass mark.
- **Search result**: A recipe row; the row adds to the open day, the three-dot control adds elsewhere.
- **Add-to target**: Either another day of the displayed week or a calendar date that may fall in another week.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every typed-search check, 100% of entered characters are unobstructed by the magnifying-glass mark.
- **SC-002**: When leftover chrome space or a keyboard-sized inset is present, there are 0 CSS pixels of uncovered planner between the white sheet and the leftover/keyboard edge; the sheet occupies that space rather than a see-through overlay.
- **SC-003**: Automated tests for the stories pass in CI (`npm test`) before merge.
- **SC-004**: A cook can type a query and pick a recipe without moving the sheet out of the way of the keyboard or guessing at hidden characters.
- **SC-005**: From one search, a cook can add a recipe to the open day in one tap, to another day of this week in two taps, or to any other date via the date picker, without opening a second picker.

## Assumptions

- The picker already lives in the planner and already moves search to the bottom of a fixed-size sheet.
- “On-screen keyboard” is modeled in tests as a visual viewport shorter than the layout viewport; device farms are out of scope for this change.
- Desktop mouse/keyboard users keep a centered dialog; the flush-to-keyboard rule applies when the visible viewport is shorter than the layout viewport by a keyboard-like amount.
- Native search-field decorations that draw their own magnifying glass are treated as a bug if they collide with our icon or text.
- “Rest of the week” means the other days of the week currently shown on the planner, not only days after today.
- Meals added from the picker are dinners, matching the existing planner.
- Adding to another week does not have to switch the planner to that week; a confirmation of the date is enough.
