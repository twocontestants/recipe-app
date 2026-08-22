# Feature Specification: Store planned dinners as calendar dates

**Feature Branch**: `cursor/calendar-date-meals-4c97`

**Created**: 2026-08-22

**Status**: Implemented

**Input**: User description: "Store a planned dinner as a calendar date, not a timezone-shifted week key. Timezones only matter to know what day the cook is on. This is a significant data-model change — every existing database query must keep working, and dinners already planned must stay on the same kitchen day."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dinners sit on a real date (Priority: P1)

A planned dinner is “Wednesday 19 August,” not “weekday 2 of a week whose key might be Sunday in UTC.” The household opens the planner and sees each dinner on the calendar day they chose. Adding, moving, or deleting a dinner writes that calendar day. “Today” and “this week” still follow the cook’s local calendar.

**Why this priority**: The timezone week key is why the planner can go blank when the host clock disagrees with the phones. The cook asked to save a date.

**Independent Test**: Plan a Wednesday dinner. It appears under Wednesday. Reload on a host whose clock is UTC — it is still Wednesday. Existing dinners from before the change appear on the same kitchen days as before.

**Acceptance Scenarios**:

1. **Given** the cook adds dinner on Wednesday 19 Aug, **When** they open that week, **Then** the dinner is on Wednesday 19 Aug (not the previous Sunday or Monday).
2. **Given** dinners were already planned before this change (including Australian rows whose week key was a Sunday), **When** the planner loads, **Then** each dinner is on the same kitchen date as before.
3. **Given** they move a dinner from Thursday to Saturday, **When** the save completes, **Then** it is stored as Saturday’s date and shows only there.

---

### User Story 2 - Existing week and shopping queries still work (Priority: P1)

Shopping-list generation, “meals for this week,” month prefetch, and notes still return the same dinners and notes after the change. Callers that still ask for a week key (including an old Sunday-style key) get the dinners for that kitchen week. Nothing that already talks to the database is left unable to find rows.

**Why this priority**: The cook required that all database queries continue to work. A date column that orphans week reads would blank the planner or shopping list again.

**Independent Test**: Generate a shopping list for this week. It includes the same recipes as the planner shows. Open last week’s notes — they are still on those days. A week request that uses an old Sunday week key still returns that week’s dinners.

**Acceptance Scenarios**:

1. **Given** dinners exist this week, **When** a shopping list is generated for this week, **Then** those recipes are included.
2. **Given** a note on Thursday, **When** that week is opened, **Then** the note is still on Thursday.
3. **Given** a week fetch uses either a Monday week key or an older Sunday week key for the same kitchen week, **When** it returns, **Then** the same dinners appear.

---

### User Story 3 - Today is the only timezone question (Priority: P2)

The only time the clock’s timezone matters is deciding which calendar day is “today” (and therefore “this week”) on the cook’s phone. Storage and matching do not convert midnight through UTC.

**Why this priority**: That was the product rule the cook stated. Display of “today” must stay local; stored dates must not shift.

**Independent Test**: On a phone in Australia, “Today” highlights the local date. Stored dinners do not move when the server is in UTC.

**Acceptance Scenarios**:

1. **Given** it is Wednesday local time, **When** the planner opens, **Then** “today” is Wednesday.
2. **Given** a dinner stored as 19 Aug, **When** any client reads it, **Then** it is 19 Aug regardless of the host timezone.

---

### Edge Cases

- Existing rows whose week key is already a Monday (written on a UTC clock) still map to the correct kitchen date (week key + weekday offset).
- Existing rows whose week key is a Sunday (typical Australian write) map to the following Monday plus the weekday offset.
- A week that the household starts on Sunday still groups the same seven local dates; only storage of the dinner date changes.
- Empty notes and deleted dinners do not leave orphan date rows that confuse a later add.
- Month and range fetches use the dinner’s calendar date, so a padded week-key window is no longer required to find Australian rows — but week-key reads must still succeed.
- Historical shopping lists keep their saved week labels; only new generation uses the date-based meals.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each planned dinner MUST be stored as a calendar date (the day the household meant), not as an instant in time.
- **FR-002**: Adding or moving a dinner MUST persist that calendar date. Matching a dinner to a planner day MUST compare calendar dates.
- **FR-003**: Existing dinners MUST remain on the same kitchen day after the change (Australian Sunday week keys and UTC Monday week keys both convert correctly).
- **FR-004**: Existing week-key, range, shopping-list, and notes queries MUST still return the same rows. Week-key reads MUST accept both a Monday key and an older Sunday key for that kitchen week.
- **FR-005**: Week grouping for display (this week / next week, household start day) MUST be computed from calendar dates. Timezone MAY be used only to decide the cook’s current local date.
- **FR-006**: Planner notes MUST stay attached to the same kitchen day and remain readable by existing week-key note queries.
- **FR-007**: Callers that still send a week key plus weekday MUST keep working; the service derives the calendar date and keeps week fields in sync so older reads do not miss the row.

### Key Entities

- **Planned dinner**: A recipe on one calendar date (plus servings / meal type). Week and weekday are derived for compatibility.
- **Planner note**: Text on one calendar date. Week and weekday remain available for existing reads.
- **Kitchen week**: Seven local dates from the household start-of-week setting. Not a stored timezone key.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the change, every dinner that was on the planner the day before is still on that same weekday and date (no off-by-one).
- **SC-002**: Opening the planner from Australia with a UTC host shows this week’s dinners on the first load (no blank week).
- **SC-003**: Generating a shopping list for this week includes every dinner the planner shows for those seven dates.
- **SC-004**: A cook can add a dinner to a date and see it on that date after a reload, with “today” still matching their local calendar.

## Assumptions

- The household is one kitchen, mostly in Australia. Existing non-Monday week keys were written as local Monday midnight via UTC date strings.
- Shopping-list rows already generated are historical snapshots; their stored week labels do not need rewriting.
- Household “week starts on” remains a display setting only.
- No new product surfaces (no per-user timezones, no travel mode).
