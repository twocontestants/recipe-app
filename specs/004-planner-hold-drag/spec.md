# Feature Specification: Planner hold-to-drag with day rail

**Feature Branch**: `cursor/planner-hold-drag-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Nah the drag to move is scuffed. It should be a hold to drag not an instant drag and drop. Also the previous week thing is shit. Let's redo the drag to move thing completely. The user should hold the card to commence dragging. When this starts, they can either drag it immediately to another date, or it comes up with a vertical timeline on the right that shows the surrounding ten days and a preview of the recipes which they can drag into. The vertical sidebar should just have the dates in circles and maybe a dotted circle where it doesn't have recipes and a solid circle where it does."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hold a meal, then drop it on another day this week (Priority: P1)

A cook presses and **holds** a planned dinner until the card lifts. They then drag it onto a different day in the week they are viewing and release. A short tap still opens the recipe. A flick or scroll on the card does not start a move. The old top/bottom “Previous week / Next week” strips are gone.

**Why this priority**: Instant drag fights scrolling and accidental taps. Hold-to-lift is the expected phone pattern.

**Independent Test**: Tap a card — recipe opens, meal stays. Hold, then drop on another day this week — meal moves. Scroll the list starting on a card — the week still scrolls and the meal does not move.

**Acceptance Scenarios**:

1. **Given** a meal is on Tuesday, **When** the cook taps it without holding long enough, **Then** the recipe opens and the meal does not move.
2. **Given** a meal is on Tuesday, **When** they hold until the card lifts, drag onto Friday, and release, **Then** it is saved as Friday’s dinner.
3. **Given** they press a card and slide before the hold finishes, **When** they keep moving, **Then** the week scrolls (or the press cancels) and no drag starts.
4. **Given** they hold and then release over the same day with no other target, **When** the hold ends, **Then** the meal stays put and nothing is written.
5. **Given** they drop onto a day that already has dinners, **When** the drop succeeds, **Then** the moved meal is added there (a day may have more than one dinner).

---

### User Story 2 - Hold reveals a ten-day rail for nearby dates (Priority: P1)

As soon as the hold lifts the card, a vertical rail appears on the right. It shows the **ten days surrounding** the meal’s date. Each day is a circle: dotted if that day has no dinners, solid if it has at least one. A short preview of the dinners on that day sits with the circle. The cook can drop the card onto a rail day to move it there, including days outside the week on screen. They can still drop onto a day in the main week list instead.

**Why this priority**: The edge-of-screen week strips were easy to hit by accident and did not show what was on those days. A dated rail with occupancy is how cooks jump a few days without changing week first.

**Independent Test**: Hold Wednesday’s dinner. The rail shows ten dates around that Wednesday, empty days dotted and filled days solid, with titles. Drop on a rail Saturday next week — the meal is there and the planner shows that week.

**Acceptance Scenarios**:

1. **Given** a hold has just begun, **When** the card lifts, **Then** the right-hand rail is visible with exactly ten consecutive days around the meal’s date.
2. **Given** a rail day has no dinners, **When** the cook looks at it, **Then** its circle is dotted (not filled).
3. **Given** a rail day has one or more dinners, **When** the cook looks at it, **Then** its circle is solid and the dinner names are previewed.
4. **Given** they drop on a rail day, **When** the move succeeds, **Then** the meal is on that calendar date; if that date is not in the week they were viewing, the planner shows the week that contains it.
5. **Given** the rail is open, **When** they drop on a day in the main week list instead, **Then** the meal moves to that week-list day (the rail does not block same-week drops).
6. **Given** they release on empty space (not a week day and not a rail day), **When** the drag ends, **Then** the rail closes and the meal stays on its original day.
7. **Given** the drag ends for any reason, **When** the session is over, **Then** the rail is gone and the Previous / Next week edge strips are not shown.

---

### User Story 3 - Hold does not fight the meal menu or a failed save (Priority: P2)

The meal-options control, Add buttons, notes, and suggestion pills are not hold handles. A failed save puts the meal back and tells the cook.

**Why this priority**: A hold that steals the menu or silently drops a meal is worse than no drag.

**Independent Test**: Open the meal menu with a tap — no rail, no move. Fail the network on a rail drop — original day is restored with an error message.

**Acceptance Scenarios**:

1. **Given** the cook taps the meal options button, **When** they open Replace / Move to / Delete, **Then** no hold-drag starts and the rail does not appear.
2. **Given** a drop is attempted and the save fails, **When** the error is shown, **Then** the meal is still on the original day.
3. **Given** a meal is still saving with a temporary id, **When** they press the card, **Then** no hold-drag starts.

---

### Edge Cases

- The ten-day window includes days before and after the held meal’s date (not only the seven days of the open week).
- The origin day appears on the rail; dropping back on it is a no-op.
- Occupancy on the origin day still counts the meal being dragged (it is still planned there until drop).
- Temporary (`tmp-*`) meals cannot be held.
- Landscape: the rail stays a vertical strip on the right; the week list remains the other drop surface.
- After a drop onto a date in another display week, the cook is taken to that week so they can see the landing spot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A meal card MUST start a move only after a deliberate hold. A short tap MUST still open the recipe. Sliding before the hold finishes MUST NOT start a move.
- **FR-002**: The cook MUST be able to drop a held meal onto another day of the displayed week.
- **FR-003**: When a hold begins, a vertical rail MUST appear on the right showing exactly ten consecutive calendar days surrounding the meal’s date.
- **FR-004**: Each rail day MUST show a date circle that is dotted when that day has no dinners and solid when it has at least one, plus a preview of those dinner names.
- **FR-005**: Dropping on a rail day MUST move the meal to that calendar date. If that date is outside the week on screen, the planner MUST then show the week that contains it.
- **FR-006**: Releasing with no week-day or rail-day target MUST cancel, hide the rail, and leave the meal where it was.
- **FR-007**: The meal options control MUST NOT start a hold-drag. Unsaved temporary meals MUST NOT start a hold-drag.
- **FR-008**: A failed move MUST restore the original day and tell the cook.
- **FR-009**: The Previous week / Next week edge strips MUST NOT appear.
- **FR-010**: Automated tests MUST cover hold vs movement, the ten-day window, rail occupancy (empty vs filled), and hit-testing that prefers the rail only when the pointer is over it.

### Key Entities

- **Meal card**: The planned dinner the cook holds.
- **Hold session**: Press → wait → lift (or cancel if they slide first) → drag → drop or cancel.
- **Week-day target**: One of the seven days on the current planner week.
- **Day rail**: Right-hand list of ten surrounding dates with occupancy circles and dinner previews.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A cook who only taps a card opens the recipe 100% of the time in the gesture tests (no accidental move).
- **SC-002**: A cook who slides on a card before the hold finishes does not enter a drag in the gesture tests (the list remains scrollable).
- **SC-003**: After a successful hold, the cook can finish a move onto another date in one gesture — either a week-list day or a rail day — without opening the meal menu.
- **SC-004**: Automated tests for hold, the ten-day window, occupancy, and hit-testing pass before merge.

## Assumptions

- Hold time is about 400ms — long enough to tell apart from a tap, short enough to feel instant in a kitchen.
- Sliding more than a small movement (about 8px) before the hold finishes cancels the hold so the page can scroll.
- “Surrounding ten days” means four calendar days before the meal’s date, that date, and five days after (ten days total). Future days slightly outnumber past days because cooks usually move leftovers forward.
- The existing Move to menu stays as a non-drag alternative.
- No new UI libraries.
- HTML5 native drag-and-drop is not used; pointer hold + move is enough for phone and desktop.
