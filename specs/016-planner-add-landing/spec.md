# Feature Specification: Planner add-landing animation

**Feature Branch**: `cursor/planner-add-landing-0972`

**Created**: 2026-09-23

**Status**: Implemented

**Input**: User description: "In the planner, when adding a recipe for a particular day, it should close the recipe selector screen and do a gentle animation to show where the recipe has been added."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Picker closes and the new dinner lands on that day (Priority: P1)

A cook opens Add dinner for a day, finds a recipe, and taps it. The recipe selector goes away at once. They are looking at the planner again. The new dinner is on that day, and it settles into place with a short, gentle motion so they can tell exactly where it went.

**Why this priority**: The picker is how dinners get onto the week. If it stays up while the save finishes, cooks cannot see the result. If the meal just appears with no cue, they have to hunt for it.

**Independent Test**: Open Add dinner for an empty day. Tap a recipe. Confirm the selector is gone before any wait, the recipe title is on that day, and that card is briefly distinguished from the rest of the week.

**Acceptance Scenarios**:

1. **Given** the recipe selector is open for Wednesday, **When** the cook taps a recipe, **Then** the selector is no longer on screen and Wednesday shows that recipe as dinner.
2. **Given** the cook has just added a recipe this way, **When** they look at that day, **Then** the new dinner is briefly highlighted with a gentle landing motion so it is obvious which card just appeared.
3. **Given** the save to the household plan is still in progress, **When** the cook taps a recipe, **Then** the selector still closes immediately and the dinner still appears on that day without waiting for the save to finish.
4. **Given** the destination day is further down the week than the cook was looking, **When** the selector closes, **Then** that day is brought into view so the landing meal is visible.

---

### User Story 2 - Adding to another day still shows the landing (Priority: P1)

A cook has the selector open for one day but uses **Add to…** to put the recipe on a different day of the week they are viewing (or on another calendar date in that same week). The selector closes. The landing animation plays on the day that actually received the meal, not the day the selector was opened for.

**Why this priority**: The three-dot menu is the other everyday add path. Landing on the wrong day would be more confusing than no animation.

**Independent Test**: Open the selector for Monday. From a recipe’s **Add to…** menu, choose Friday. Confirm the selector closes and Friday’s new dinner is the one that lands.

**Acceptance Scenarios**:

1. **Given** the selector was opened for Monday, **When** the cook adds a recipe to Friday via **Add to…**, **Then** the selector closes and Friday shows the new dinner with the landing motion.
2. **Given** Friday already has another dinner, **When** the cook adds a second recipe there, **Then** the newly added card is the one that lands; the existing dinner stays put without the landing motion.
3. **Given** the cook opened the selector to replace a dinner, **When** they tap a recipe for that same day, **Then** the selector closes and the replacement dinner is the one that lands.

---

### User Story 3 - Adding to a week they are not viewing (Priority: P2)

A cook uses **Another date…** to add a recipe to a day in a different week. After the selector closes, the planner shows that week and the new dinner lands there, so they can see where it went instead of only being told.

**Why this priority**: Less common than adding to the week on screen, but “show where it was added” fails if the destination is off-screen in another week.

**Independent Test**: From this week’s selector, add a recipe to a date two weeks later. Confirm the selector closes, the planner is showing that later week, and the new dinner lands on the chosen day.

**Acceptance Scenarios**:

1. **Given** the cook is viewing this week, **When** they add a recipe to a date in another week, **Then** the selector closes, the planner shows that week, and the new dinner lands on the chosen day.
2. **Given** the cook prefers reduced motion, **When** they add a recipe (this week or another), **Then** the selector still closes and the new dinner is still briefly marked, without a sliding or bouncing motion.

---

### Edge Cases

- If the save fails after the dinner has already appeared, the meal is removed, an error is shown, and no landing highlight is left behind.
- If the cook dismisses the selector without choosing a recipe, nothing is added and no landing animation runs.
- Opening **Add to…** and cancelling the menu does not close the selector.
- Adding the same recipe to two different days in two separate taps lands on the day of the latest tap.
- Reduced-motion settings skip movement but still make the new dinner briefly distinct.
- Auto-plan / magic week fill is out of scope; this feature is the recipe selector add path.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Choosing a recipe from the planner’s recipe selector MUST close the selector immediately, without waiting for the dinner to finish saving.
- **FR-002**: After a successful add from the selector, the cook MUST be able to see the new dinner on the day it was added.
- **FR-003**: The newly added dinner MUST play a short, gentle landing animation (or a static highlight when motion is reduced) so the cook can tell which card just appeared.
- **FR-004**: The landing cue MUST apply to the destination day of the add, including when that day is not the day the selector was opened for.
- **FR-005**: If the destination day is not fully visible, the planner MUST bring that day into view as the selector closes.
- **FR-006**: If the destination day is in a week the cook is not currently viewing, the planner MUST show that week so the landing dinner is visible.
- **FR-007**: A failed save MUST restore the previous plan and MUST NOT leave a landing highlight on a dinner that is no longer there.
- **FR-008**: Existing dinners on the destination day MUST NOT receive the landing cue; only the dinner that was just added (or the replacement) MUST.
- **FR-009**: Automated tests MUST cover immediate selector close, destination-day landing, and the rule for revealing another week.

### Key Entities

- **Recipe selector**: The search overlay used from the planner to pick a dinner for a day.
- **Destination day**: The calendar day the cook chose to receive the recipe (row tap, rest-of-week menu, or another date).
- **Landing dinner**: The meal card that just appeared (or replaced another) on the destination day.
- **Landing cue**: The short visual that points to the landing dinner after the selector closes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After tapping a recipe in the selector, the selector is gone on the next view of the planner (no extra wait for the save).
- **SC-002**: In 100% of same-week adds from the selector, the cook can see the new dinner on the destination day without opening another screen.
- **SC-003**: The landing cue lasts about one second or less and does not block tapping the new dinner or the rest of the planner.
- **SC-004**: A cook adding to a day they cannot currently see (further down this week, or another week) can still find that dinner without searching the week by hand.
- **SC-005**: Automated coverage for the stories passes before merge.

## Assumptions

- This change is only for adding from the planner recipe selector, not from the recipe library’s separate “add to planner” sheet.
- Meals added from the selector remain dinners, matching the existing planner.
- Closing the selector immediately uses the dinner already shown on the planner (optimistic), matching how same-week adds already work; a failed save still rolls back.
- “Gentle” means a short settle/highlight on the new card, not a long flight from the selector row to the day.
- Bringing another week on screen supersedes the earlier “toast only” confirmation for off-week adds from this selector.
- Household reduced-motion preference is the platform setting, not a new in-app toggle.
