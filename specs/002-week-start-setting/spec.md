# Feature Specification: Flexible week start setting

**Feature Branch**: `cursor/week-start-setting-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Also there needs to be a custom setting that allows users to change the week start date. It needs to be flexible. Plan and implement this in speckit"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose any weekday as the start of the week (Priority: P1)

A cook opens Settings and picks which weekday their planning week begins on — Sunday, Monday, Tuesday, or any other day. The choice is saved for the household. Until they change it, every week they see starts on that day.

**Why this priority**: Households do not all treat Monday as day one. Without this setting the planner fights how they actually shop and cook.

**Independent Test**: Change the setting from Monday to Sunday, leave Settings, open the planner, and confirm the first column is Sunday and that “this week” runs Sunday through Saturday.

**Acceptance Scenarios**:

1. **Given** the household has never set a week start, **When** they open Settings, **Then** the control shows Monday (the current default) and they can pick any of the seven weekdays.
2. **Given** they choose a weekday and the save succeeds, **When** they return later, **Then** that weekday is still selected.
3. **Given** they pick an invalid or empty value (for example a stale client), **When** the setting is read, **Then** the household still sees a valid week starting Monday.

---

### User Story 2 - Planner and add-to-plan follow the chosen start day (Priority: P1)

After changing the start day, the weekly planner, the Recipes “Add to planner” sheet, and week labels (“This week”, “Next week”, date ranges) all use that start day. Columns run for seven days from the chosen weekday. Meals already planned stay on the same calendar dates — only the window and column order change.

**Why this priority**: A setting that does not move the plan is unused. Cooks must see the new week immediately.

**Independent Test**: Plan a meal on Wednesday. Switch the start day to Sunday. Wednesday still shows that meal, and it is the fourth column (Sun–Sat). Switch to Wednesday: that meal is the first column of the week that contains it.

**Acceptance Scenarios**:

1. **Given** a meal is saved for a calendar Wednesday, **When** the start day changes, **Then** that meal still appears on Wednesday’s date.
2. **Given** the start day is Sunday, **When** the cook opens the planner on a Wednesday, **Then** “this week” is the Sunday-through-Saturday span that contains today, and Today still highlights the current date.
3. **Given** the start day is Thursday, **When** they add a recipe from the Recipes sheet to “this week”, **Then** the day list starts on Thursday and the meal is stored for the calendar date they picked.
4. **Given** they generate a shopping list for “this week” / “next week”, **When** the start day is not Monday, **Then** those labels use the same seven-day window as the planner.

---

### User Story 3 - Change the start day again without losing the plan (Priority: P2)

The cook can change the start day as often as they like. Each change is immediate. Existing dinners and day notes stay attached to their calendar days. No extra confirm step is required; the control is the same seven-weekday list.

**Why this priority**: “Flexible” means they are not locked into the first choice. Losing meals on a setting change would be worse than no setting.

**Independent Test**: Save meals on two different weekdays, flip the start day twice, and confirm both meals remain on their original dates and the column order matches the latest choice.

**Acceptance Scenarios**:

1. **Given** meals exist on several days, **When** the start day is changed twice in a row, **Then** every meal is still on its original calendar date after each change.
2. **Given** a day note exists for Friday, **When** the start day changes, **Then** Friday still shows that note.
3. **Given** a save fails, **When** the cook looks at Settings, **Then** they are told it did not save and the previous start day remains in effect.

---

### Edge Cases

- Mid-week change: “this week” immediately becomes the seven days that start on the newly chosen weekday and contain today (it may include days already past).
- A display week can span two stored Monday weeks (for example Sunday-start includes the previous Sunday and the following Saturday). Both must load.
- Landscape / phone: the start-day control stays tappable and not crushed beside its label (same pattern as the existing category preference).
- Unknown stored value: treat as Monday and keep the planner usable.
- Shopping-list generation for last / this / next week must use the same start day as the planner so cooks do not pick the wrong seven days.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The household MUST be able to choose any of the seven weekdays as the start of their planning week.
- **FR-002**: The choice MUST persist across visits until they change it again.
- **FR-003**: When no choice has been saved, the week MUST start on Monday (today’s behaviour).
- **FR-004**: The planner grid, Recipes add-to-plan sheet, and “this / next / last week” labels MUST all use the saved start day.
- **FR-005**: Changing the start day MUST NOT move an existing meal or day note off its calendar date.
- **FR-006**: Adding or moving a meal MUST store it against the calendar date the cook selected, regardless of start day.
- **FR-007**: An unreadable or invalid saved value MUST fall back to Monday without blocking the planner.
- **FR-008**: A failed save MUST leave the previous start day in effect and tell the cook.
- **FR-009**: Automated tests MUST cover start-of-week math (any weekday), Monday fallback, and that a stored Wednesday stays Wednesday after the start day changes.

### Key Entities

- **Week start day**: The weekday that is column one of every planning week (one of seven; default Monday).
- **Display week**: Seven consecutive calendar days beginning on the week start day.
- **Planned meal**: A dinner already attached to a calendar date; its date does not change when the start day does.
- **Day note**: Free text attached to a calendar date on the planner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A cook can set the week start day in one control on Settings and see the new first column on the planner without a second configuration step.
- **SC-002**: After a start-day change, 100% of already-planned dinners remain on the same calendar dates.
- **SC-003**: For each of the seven possible start days, “this week” is exactly the seven-day span that begins on that weekday and contains today.
- **SC-004**: Automated tests for the start-day rules pass before merge (`npm test`).

## Assumptions

- “Week start date” means which weekday begins each planning week, not a one-off calendar date (for example “start this plan on 25 August”). A single arbitrary date is out of scope.
- “Flexible” means any of the seven weekdays, not only Saturday / Sunday / Monday.
- This is a household-wide preference (the app already stores household settings, not per-person accounts).
- Existing meals stay on the calendar day they were saved to; only grouping and column order change.
- Default remains Monday so current plans look the same until someone changes the setting.
- Locale labels stay English short names (Mon–Sun), matching the rest of the app.
