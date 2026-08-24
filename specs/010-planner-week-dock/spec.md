# Feature Specification: Planner week dock and day tones

**Feature Branch**: `cursor/planner-week-dock-4c97`

**Created**: 2026-08-24

**Status**: Implemented

**Input**: User description: "Add a week picker at the bottom of the planner page. Subtle accent colour over the recipe for the current day. Subtle grey for previous recipes in the week."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change week from the bottom (Priority: P1)

After scrolling through the week, the cook can still jump to last week, next week, or today without scrolling back to the title. The same week label they already know (This week / Next week / date range) sits at the bottom of the planner, above the phone tab bar.

**Why this priority**: The week list is long on a phone. The only picker is at the top, so changing week after reading Sunday means a long scroll.

**Independent Test**: Open this week, scroll to the last day, use the bottom controls to open next week — the list shows next week. Tap Today — this week returns.

**Acceptance Scenarios**:

1. **Given** the planner is open, **When** they scroll to the bottom, **Then** a week picker is there (previous, week name, next, and Today when not on this week).
2. **Given** they are on this week, **When** they tap next on the bottom picker, **Then** they see next week’s dinners.
3. **Given** they are not on this week, **When** they tap Today, **Then** this week is showing.
4. **Given** a phone with the bottom navigation, **When** they use the picker, **Then** it sits above that bar (not underneath it).

---

### User Story 2 - Today’s dinner has a quiet accent (Priority: P1)

On this week, the recipe card for today has a light accent so it reads as “cook this,” without shouting. Other days this week keep their normal cards except past days (story 3).

**Why this priority**: The cook asked to see today at a glance among the stacked recipes.

**Independent Test**: Open this week with a dinner on today. That card has a light accent. Tomorrow’s card does not.

**Acceptance Scenarios**:

1. **Given** this week is showing and today has a dinner, **When** they look at today’s card, **Then** it has a subtle accent (not the same as a normal card).
2. **Given** they are viewing next week, **When** they look at any card, **Then** none of those days are treated as “today.”

---

### User Story 3 - Earlier dinners this week look quieter (Priority: P2)

On this week, recipe cards for days before today are slightly greyed so they read as already done, while day names stay readable.

**Why this priority**: The cook asked for previous recipes in the week to recede, not for the whole day block to vanish.

**Independent Test**: Open this week with dinners on yesterday and tomorrow. Yesterday’s card is greyer; tomorrow’s is not.

**Acceptance Scenarios**:

1. **Given** this week with a dinner yesterday, **When** they look at that card, **Then** it is subtly grey compared with a future day’s card.
2. **Given** next week, **When** they look at those dinners, **Then** they are not greyed as “already cooked.”

### Edge Cases

- This week with no dinner today: no accent card, picker still works.
- First day of the household week is today: no grey cards that week.
- Last day of the week is today: all earlier cards grey, today’s accented.
- Bottom picker and top picker always show the same week.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The planner MUST offer week previous / next (and Today when not on this week) at the bottom of the page as well as the top.
- **FR-002**: Bottom week controls MUST stay usable above the phone tab bar.
- **FR-003**: On this week, today’s recipe cards MUST have a subtle accent. Other weeks MUST NOT treat a day as today.
- **FR-004**: On this week, recipe cards before today MUST be subtly grey. Day headings MUST remain readable. Other weeks MUST NOT grey cards as past.

### Key Entities

- **This week**: The seven kitchen days from the household week-start setting that contain today.
- **Today’s dinner**: A planned recipe on the cook’s local calendar day.
- **Past dinner (this week)**: A planned recipe on a day in this week before today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the last day of the list, the cook can change week without scrolling to the title.
- **SC-002**: On this week, today’s dinner card is distinguishable from tomorrow’s at a glance.
- **SC-003**: On this week, yesterday’s dinner card is quieter than a future day’s, and the weekday name is still readable.

## Assumptions

- Top week controls stay; the bottom picker is an extra copy, not a replacement.
- Accent and grey apply to recipe cards, not to empty “Add dinner” pills.
- Household week-start setting still defines the seven days.
