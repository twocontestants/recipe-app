# Feature Specification: Faster planner load

**Feature Branch**: `012-planner-load-speed`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Do all seven planner speed-ups: no schema work on planner browse; load the week once (do not refetch when week-start preference hydrates to the same day); one meals request for first paint; card-shaped meals without method bodies; do not block the week on the cookbook (load it when the picker opens); one notes request for the display week; index meals by owner and planned day."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The week appears in one meals trip (Priority: P1)

A cook opens Planner. They see this week’s dinners after one meals download for the calendar month that covers the week. The page does not sit on table-migration work, and it does not download the week a second time just because week-start preference finished loading.

**Why this priority**: The empty spinner is the first complaint. One light meals read is the MVP.

**Independent Test**: Open Planner signed in. Confirm one meals request for the visible month (not a second week-by-week copy), cards appear, and browsing does not depend on a second identical load when the week-start setting becomes known if that day is already what is on screen.

**Acceptance Scenarios**:

1. **Given** a signed-in cook with planned dinners this week, **When** they open Planner, **Then** the week fills from one meals range request whose result is enough to draw cards (title, image, protein, times, tags, whether they can edit).
2. **Given** the household week starts on the same day the page already assumed, **When** preferences finish loading, **Then** the week is not fetched again for that reason alone.
3. **Given** the household week starts on a different day than the first assumption, **When** preferences load, **Then** the week is fetched once more for the corrected week (this is an intentional second request).
4. **Given** kitchen tables already exist, **When** a cook only browses Planner, **Then** that browse does not run kitchen table-creation or column-migration work.

---

### User Story 2 - Opening the picker still has the cookbook (Priority: P2)

A cook taps Add. They still search their kitchen and the public library. That cookbook is not required to draw this week’s cards.

**Why this priority**: Slimming first paint must not break adding a dinner.

**Independent Test**: Open Planner; week shows. Open the picker; recipes are there to choose.

**Acceptance Scenarios**:

1. **Given** the week is showing, **When** the cook has not opened the picker, **Then** first paint did not wait on the full cookbook list.
2. **Given** the cook opens Add, **When** the picker appears, **Then** they can search and pick recipes (cookbook loads then if it was not already in memory).
3. **Given** empty days had suggestion chips that need the cookbook, **When** the cookbook is not loaded yet, **Then** the week still shows; suggestions may appear once recipes are available.

---

### User Story 3 - Notes still show for the week (Priority: P2)

Day notes for the visible week still appear. They load in one request for that week, not one request per storage week.

**Why this priority**: Notes are part of the week; they must not multiply round-trips.

**Independent Test**: Open a week with notes on two days. Both notes appear. Only one notes download for that week.

**Acceptance Scenarios**:

1. **Given** notes on more than one day this week, **When** the cook opens Planner, **Then** those notes appear from a single notes request covering the display week.
2. **Given** the cook edits a note, **When** it saves, **Then** it still persists as today (per-day save unchanged).

---

### User Story 4 - Shopping still has the full method (Priority: P2)

Generating a shopping list still has ingredient lines. Those details load when generating a list, not as part of every planner card.

**Why this priority**: Slimming planner meals must not break shopping.

**Independent Test**: Generate a list from planned dinners. Ingredients merge as they do today.

**Acceptance Scenarios**:

1. **Given** dinners planned this week, **When** the cook generates a shopping list, **Then** ingredient lines from those recipes are present.
2. **Given** the planner grid is showing cards, **When** the cook only browses, **Then** meal payloads do not include method bodies.

---

### User Story 5 - Owner lookups stay cheap as the plan grows (Priority: P3)

Listing “my meals on these days” stays a direct lookup as the table grows, not a scan of every row by date alone.

**Why this priority**: Helps every planner load; independent of the UI fetch behaviour.

**Independent Test**: Confirm owner-and-planned-day lookups are indexed the same way other kitchen list filters are.

**Acceptance Scenarios**:

1. **Given** meal rows owned by different cooks, **When** a cook lists their week, **Then** the store can find those rows by owner and planned day without relying only on a date index.

---

### Edge Cases

- Meals request fails: show the existing error toast; do not leave a stuck spinner.
- Notes request fails: week cards still show; notes may be empty.
- Cookbook load fails when opening the picker: show an error; do not block the week already on screen.
- Week that spans two calendar months: first paint may request both months (that is one range per month, still no extra week-by-week copy).
- Adjacent-month prefetch after first paint remains allowed.
- Generate-list and Recipes “add to planner” may still request weeks they need; this story is about opening Planner.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Browsing Planner meals and notes MUST NOT run kitchen schema creation or column migration. Schema work stays on explicit setup (and writes that already ensure schema).
- **FR-002**: Opening Planner MUST load meals for the visible week once for a given week-start day. Learning the week-start preference after mount MUST NOT by itself trigger another meals load when that day is already on screen.
- **FR-003**: First paint MUST NOT issue a separate week-by-week meals request when the month range for that week is already being fetched.
- **FR-004**: Planner meal reads for the grid MUST return card fields for the nested recipe (identity, title, image, times, tags, protein, whether the viewer can edit). They MUST NOT include ingredient lines or method steps.
- **FR-005**: Opening the recipe picker MUST load the cookbook list if it is not already in memory. First paint of the week MUST NOT wait on that cookbook list.
- **FR-006**: Notes for the visible display week MUST load in one request covering that week’s days.
- **FR-007**: Generating a shopping list MUST still receive full recipes (including ingredients) for the selected dinners.
- **FR-008**: The store MUST support fast listing of meals by owner plus planned day.

### Key Entities

- **Planner meal card**: A planned dinner plus enough recipe fields to draw the week card. No method body.
- **Planner meal detail**: Card plus ingredients and steps. Used when generating a shopping list.
- **Week notes**: Per-day text for the visible display week, loaded as one week-shaped set keyed by calendar day.
- **Cookbook filter**: Unchanged; picker still uses include-public cards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening Planner with a typical household week no longer shows a long empty wait caused by loading every method body or the whole cookbook up front.
- **SC-002**: A cook whose week-start day matches the first assumption sees the week after one meals load, not two.
- **SC-003**: Day notes for the visible week appear without a separate notes download per storage week.
- **SC-004**: Generating a shopping list still includes ingredient lines from planned dinners.

## Assumptions

- Kitchen tables are already created in production via `/api/setup`; browse may fail closed if setup was never run.
- No new libraries. Card vs detail is a slimmer read of the same meals, not a new store.
- Adjacent-month prefetch after first paint stays.
- Image download size is out of scope.
- Per-day note save stays as it is (one write per edited day).
