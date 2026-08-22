# Feature Specification: Planner drag-to-move meals

**Feature Branch**: `cursor/planner-drag-move-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Can you also include drag to move recipes between days functionality. Including some way to move them to previous or next week via a thing that shows up if they go to the top or bottom. Use speckit to plan before implementing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag a meal onto another day this week (Priority: P1)

A cook presses and drags a planned dinner onto a different day in the week they are viewing. The card follows their finger or pointer. The day under the pointer highlights. Releasing drops the meal onto that day. A short tap still opens the recipe; the existing meal menu still works.

**Why this priority**: Moving leftovers or swapping nights is the everyday job. The menu already does this; dragging is faster on a phone.

**Independent Test**: Drag Monday’s dinner onto Wednesday. Wednesday shows it; Monday does not. Tap (no drag) still opens the recipe.

**Acceptance Scenarios**:

1. **Given** a meal is on Tuesday, **When** the cook drags it onto Friday and releases, **Then** it is saved as Friday’s dinner and Tuesday is empty of that meal.
2. **Given** the cook presses a meal and moves less than a small drag threshold, **When** they release, **Then** the recipe opens as a tap and the meal does not move.
3. **Given** they release over the same day they started on, **When** the drag ends, **Then** the meal stays put and nothing is written.
4. **Given** they drag over a day with other meals, **When** they drop, **Then** the moved meal is added to that day (days may hold more than one dinner).

---

### User Story 2 - Drag to last week or next week at the screen edges (Priority: P1)

While dragging, if the pointer reaches the top of the screen a **Previous week** strip appears. At the bottom, a **Next week** strip appears. Dropping on a strip moves the meal to the same weekday in that adjacent week (for example Wednesday → previous Wednesday). The planner then shows that week so the cook can see where it landed.

**Why this priority**: Without an edge target, a cook cannot drag across week boundaries; they would have to change week first and lose the drag.

**Independent Test**: Drag a Wednesday meal to the top strip and drop. The planner shows last week; that Wednesday has the meal.

**Acceptance Scenarios**:

1. **Given** a drag is in progress, **When** the pointer enters the top edge band, **Then** a Previous week target appears and is the drop target (not the first day of the list).
2. **Given** a drag is in progress, **When** the pointer enters the bottom edge band, **Then** a Next week target appears the same way.
3. **Given** the pointer leaves the edge band but the drag continues, **When** it is back over the day list, **Then** the week strip hides and day highlighting resumes.
4. **Given** they drop on Previous week or Next week, **When** the move succeeds, **Then** the meal is on the same weekday of that adjacent week and the planner is showing that week.
5. **Given** they release outside any day and outside both strips, **When** the drag ends, **Then** the meal returns to its original day.

---

### User Story 3 - Drag does not fight notes, menus, or failed saves (Priority: P2)

The hamburger meal menu, Add buttons, notes, and suggestion pills are not drag handles. If the save fails, the meal snaps back and the cook is told. Cancelling (release with no target) does not write.

**Why this priority**: A drag that steals taps or silently loses a meal is worse than no drag.

**Independent Test**: Open the meal menu without starting a drag. Fail the network on a drop and confirm the meal is back on the original day with an error toast.

**Acceptance Scenarios**:

1. **Given** the cook taps the meal options button, **When** they open Replace / Move to / Delete, **Then** no drag starts.
2. **Given** a drop is attempted and the save fails, **When** the error is shown, **Then** the meal is still on the original day.
3. **Given** a drag is in progress, **When** they type in a day note or use Add, **Then** those controls were not the drag source.

---

### Edge Cases

- First and last days of the week must remain droppable; the week strips are viewport overlays, not those day rows.
- On a short phone, the edge band must not cover most of the first or last day — it is a thin strip at the visual viewport edge.
- Landscape: the same top/bottom strips (the list still scrolls vertically).
- Temporary (unsaved) meals with a fake id must not start a drag, or a drop must wait until they have a real id.
- Moving to a week the cook is not viewing still persists; after an edge drop they are taken to that week.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The cook MUST be able to drag a saved meal card onto another day of the displayed week to move it there.
- **FR-002**: A press that does not travel past a small movement threshold MUST remain a tap (open the recipe).
- **FR-003**: While dragging, the day under the pointer MUST be visually distinct as the drop target.
- **FR-004**: When the pointer is in a thin band at the top of the visible screen during a drag, a Previous week drop target MUST appear; a matching Next week target MUST appear at the bottom.
- **FR-005**: Dropping on Previous week or Next week MUST move the meal to the same weekday column in that adjacent week and then show that week.
- **FR-006**: Releasing with no valid target MUST cancel and leave the meal where it was.
- **FR-007**: The meal options control MUST NOT start a drag.
- **FR-008**: A failed move MUST restore the original day and tell the cook.
- **FR-009**: Automated tests MUST cover drag-threshold, day hit-testing, top/bottom edge-band priority over the day list, and same-weekday mapping for adjacent weeks.

### Key Entities

- **Meal card**: The planned dinner the cook drags.
- **Day drop target**: One of the seven days on the current planner week.
- **Week-edge strip**: A Previous week or Next week overlay that appears only during a drag when the pointer is in the matching viewport edge band.
- **Drag session**: Pointer down → optional drag → drop or cancel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A cook can move a meal to another day this week in one drag, without opening the meal menu.
- **SC-002**: A cook can move a meal to the previous or next week in one drag that ends on the edge strip (no separate week-change first).
- **SC-003**: Taps that move less than the drag threshold open the recipe 100% of the time in the automated gesture tests (no accidental move).
- **SC-004**: Automated tests for the drag rules pass before merge (`npm test`).

## Assumptions

- Days stay a vertical list; dragging is primarily up and down.
- “Same weekday” for an adjacent-week drop means the same column (the household week-start setting still applies).
- HTML5 native drag-and-drop is not required; pointer-based dragging is enough for phone and desktop.
- The existing Move to menu remains as a non-drag alternative.
- No new UI libraries.
