# Feature Specification: Keep planned days as calendar-day strings

**Feature Branch**: `cursor/spec-day-strings-4c97`

**Created**: 2026-08-24

**Status**: Implemented

**Input**: User description: "A planned dinner is just a YYYY-MM-DD string, not a calculated ISO instant. Postgres already stores the calendar day that way. Do not wrap it in a clock time or a weekday label. Include this via speckit so it does not regress."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dinners land on the day they were planned (Priority: P1)

The cook opens this week’s planner and sees each dinner on the calendar day they chose (for example 24 August), not missing, not on the wrong weekday, and not labelled as “Mon Aug 24” instead of that date.

**Why this priority**: After dinners were stored as calendar dates, the planner still went blank because the day was rewritten as a weekday name on the way out. The household cannot plan if the grid does not show what is already booked.

**Independent Test**: With dinners already planned this week, open the planner. Each dinner is under the same calendar day as when it was saved. Refresh. They are still there.

**Acceptance Scenarios**:

1. **Given** a dinner was saved for 24 August, **When** the planner loads this week, **Then** that dinner is on 24 August (not absent, not on another day).
2. **Given** several dinners exist across the week, **When** the cook refreshes, **Then** every dinner is still on its saved calendar day.
3. **Given** the host clock is UTC and the phones are in Australia, **When** either opens the planner, **Then** the dinners sit on the same calendar days.

---

### User Story 2 - The stored day stays a day, not a time or a weekday name (Priority: P1)

A planned day is the calendar label the household meant (year, month, day). Reading it back MUST yield that same label. It MUST NOT become a weekday phrase, a time of day, or a timezone-shifted instant.

**Why this priority**: The cook stated the model: it is just that date string. Converting it through a clock is what hid the dinners.

**Independent Test**: Save a dinner on a known date. Read that dinner back. The day field is that calendar date, not “Monday …” and not a timestamp.

**Acceptance Scenarios**:

1. **Given** a dinner on 24 August 2026, **When** it is read for the planner, **Then** the day is 24 August 2026 in year-month-day form.
2. **Given** that dinner, **When** the planner matches it to a cell, **Then** it compares calendar-day labels, not weekday names.
3. **Given** a note on the same kitchen day, **When** notes load, **Then** the note stays on that day.

---

### Edge Cases

- A dinner whose day was previously mangled into a weekday label must show on the real calendar day after this rule is in place (no need to re-plan).
- Month and week views both match on the calendar-day label.
- “Today” may use the cook’s local clock; stored days still do not.
- Historical shopping-list snapshots are unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each planned dinner’s day MUST be a calendar date in year-month-day form (YYYY-MM-DD). That value is the day the household meant.
- **FR-002**: Loading dinners for the planner MUST keep that year-month-day label. The system MUST NOT replace it with a weekday name or a date-time instant.
- **FR-003**: Matching a dinner to a planner cell MUST compare those year-month-day labels.
- **FR-004**: Planner notes’ kitchen day MUST follow the same rule.
- **FR-005**: Agents and future changes MUST treat this as a product rule, not a one-off bugfix: do not wrap a kitchen day in a clock type that stringifies as a weekday.

### Key Entities

- **Kitchen day**: The calendar date as YYYY-MM-DD. Not a weekday name, not an instant.
- **Planned dinner**: A recipe on one kitchen day (see 008-calendar-date-meals).
- **Planner note**: Text on one kitchen day.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a reload, every dinner that was on the planner is still on the same calendar day (zero dinners missing because the day label changed shape).
- **SC-002**: A cook can name the date of a dinner (e.g. 24 August) and see it under that date on first load and after refresh.
- **SC-003**: Opening the planner from Australia with a UTC host still shows this week’s dinners on the first load.

## Assumptions

- 008-calendar-date-meals already stores the kitchen day as a calendar date. This feature only requires that label to survive load and match.
- Household is one kitchen, mostly Australia; host may be UTC.
- No per-user timezones or travel mode.
