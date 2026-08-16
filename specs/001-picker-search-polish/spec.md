# Feature Specification: Planner picker search polish

**Feature Branch**: `cursor/planner-picker-polish-ffdc`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "The magnifying glass symbol appears over the first character of text when typing. There is a noticeable gap between the keyboard and the bottom of the modal so I can see the content underneath."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Typed search text stays clear of the icon (Priority: P1)

A cook opens the planner recipe picker and types a recipe name. The magnifying-glass decoration stays beside the field. Every character they type is fully visible and never sits under the icon.

**Why this priority**: Overlapping text makes search unusable; this is the first thing they notice while typing.

**Independent Test**: Open the picker, type at least one character, and confirm the first character is not covered by the search icon.

**Acceptance Scenarios**:

1. **Given** the recipe picker is open with an empty search field, **When** the user types "pasta", **Then** each letter is fully visible to the right of the magnifying-glass icon with a clear gap between icon and text.
2. **Given** the search field already contains text, **When** the user continues typing or places the caret at the start, **Then** the icon still does not cover any character.

---

### User Story 2 - Keyboard sits flush with the picker (Priority: P1)

A cook taps the search field on a phone. The on-screen keyboard appears. The picker sheet meets the top of the keyboard. No strip of the planner (or other page content) is visible between the sheet and the keyboard.

**Why this priority**: The gap breaks the sense that the picker owns the screen and exposes the page behind it.

**Independent Test**: On a phone-sized viewport, focus search so a keyboard-sized inset appears, and confirm there is no uncovered page content between the sheet bottom and the keyboard top.

**Acceptance Scenarios**:

1. **Given** the recipe picker is open on a phone, **When** the user focuses the search field and the keyboard occupies the lower part of the screen, **Then** the picker sheet’s bottom edge meets the visible area above the keyboard with no page content showing in between.
2. **Given** the keyboard is open, **When** the user types and the result list shrinks, **Then** the sheet still fills the remaining visible area and does not leave a gap above the keyboard.
3. **Given** the keyboard is dismissed, **When** the picker remains open, **Then** the sheet returns to filling the visible screen without a leftover empty band.

---

### Edge Cases

- Very short keyboards or accessory bars (autocomplete) must not leave a page-content strip between sheet and keys.
- Landscape phones, where the visible area above the keyboard is short, still keep the search field visible and unobstructed.
- Desktop and tablet pointing devices (no on-screen keyboard) keep the existing centered picker; no keyboard-gap logic should punch a hole in the sheet.
- Empty search results still occupy the same sheet; only the list contents change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The search icon MUST sit beside the typed value, never overlapping it, including the first character.
- **FR-002**: Focusing the search field on a device with an on-screen keyboard MUST keep the picker sheet flush with the top of the remaining visible area (no uncovered planner/page strip between sheet and keyboard).
- **FR-003**: While the keyboard is open, the recipe list MUST shrink inside the sheet so search remains visible at the bottom of the sheet.
- **FR-004**: A full-screen backdrop MUST cover the planner whenever the picker is open, including any region not occupied by the white sheet.
- **FR-005**: Dismissing the keyboard MUST restore the sheet to the full visible area without a persistent gap.
- **FR-006**: Automated tests MUST cover icon-vs-text layout rules and the viewport-box math that sizes the sheet above a keyboard.

### Key Entities

- **Picker sheet**: The white recipe-search panel (header, scrollable results, search field).
- **Visible viewport**: The portion of the screen the user can see once the keyboard is accounted for.
- **Search field**: The text entry at the bottom of the sheet, with a decorative magnifying-glass mark.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every typed-search check, 100% of entered characters are unobstructed by the magnifying-glass mark.
- **SC-002**: When a keyboard-sized inset is present, the measured gap between sheet bottom and visible-area bottom is 0 CSS pixels of uncovered page content.
- **SC-003**: Automated tests for both stories pass in CI (`npm test`) before merge.
- **SC-004**: A cook can type a query and pick a recipe without moving the sheet out of the way of the keyboard or guessing at hidden characters.

## Assumptions

- The picker already lives in the planner and already moves search to the bottom of a fixed-size sheet.
- “On-screen keyboard” is modeled in tests as a visual viewport shorter than the layout viewport; device farms are out of scope for this change.
- Desktop mouse/keyboard users keep a centered dialog; the flush-to-keyboard rule applies when the visible viewport is shorter than the layout viewport by a keyboard-like amount.
- Native search-field decorations that draw their own magnifying glass are treated as a bug if they collide with our icon or text.
