# Feature Specification: Faster shopping list load

**Feature Branch**: `013-shopping-list-speed`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Do all six shopping-list speed-ups: no schema work on shopping browse; index GET returns dropdown meta only (no item bodies); first paint is that meta plus one detail read for the open list; do not download the whole cookbook for recipe source links; generate with one meals query for the selected weeks (full ingredients still); index lists by owner and generated time."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The open list appears without a heavy index (Priority: P1)

A cook opens Shopping. They see the newest list after a light dropdown load plus one full read of that list. The page does not sit on table-migration work, and the dropdown does not download every list’s item bodies.

**Why this priority**: The empty spinner is the first complaint. Meta plus one detail read is the MVP.

**Independent Test**: Open Shopping signed in with several saved lists. Confirm the dropdown names arrive without item bodies, the open list’s items appear from one detail read, and browsing does not run kitchen table-creation or column-migration work.

**Acceptance Scenarios**:

1. **Given** a signed-in cook with more than one saved list, **When** they open Shopping, **Then** the dropdown is filled from a meta list (identity, name, subtitle, when it was generated, which recipes it came from) and the open list’s items come from a separate detail read.
2. **Given** several lists each with many items, **When** they only need the dropdown, **Then** that index read does not include item lines, check marks, overrides, custom items, or aisle order.
3. **Given** kitchen tables already exist, **When** a cook only browses Shopping, **Then** that browse does not run kitchen table-creation or column-migration work.
4. **Given** no list is selected yet, **When** the meta list arrives, **Then** the newest list opens (one detail read).

---

### User Story 2 - Recipe pills still link without the cookbook (Priority: P2)

A cook still taps a recipe name on a shopping line and reaches the original source when one exists. Opening Shopping does not wait on the whole cookbook to build those links.

**Why this priority**: Slimming first paint must not break source links, and must not reintroduce a full cookbook download.

**Independent Test**: Open a list whose recipes have original URLs. Pills link. Opening Shopping does not download the whole cookbook for that reason.

**Acceptance Scenarios**:

1. **Given** a newly generated list from recipes that have original URLs, **When** the cook opens that list, **Then** recipe pills link to those URLs.
2. **Given** an older list that was generated before URLs were stored on the lines, **When** the cook opens it, **Then** pills still link using the recipe identities already on the list (not a full cookbook download).
3. **Given** a recipe with no original URL, **When** the list shows, **Then** the pill remains a label, not a broken link.
4. **Given** the cook has not opened Recipes, **When** they only browse Shopping, **Then** first paint does not wait on a full cookbook list.

---

### User Story 3 - Generating a list still has every ingredient (Priority: P2)

A cook generates a list from one or more planned weeks. Ingredient lines still merge as they do today. The kitchen loads those weeks in one meals read, not one read per selected week.

**Why this priority**: Faster generate must not drop ingredients.

**Independent Test**: Generate a list covering two weeks of dinners. Ingredient lines from both weeks are present.

**Acceptance Scenarios**:

1. **Given** dinners planned across more than one selected week, **When** the cook generates a list, **Then** ingredient lines from those recipes are present.
2. **Given** the cook generates a list, **When** the kitchen reads the selected weeks, **Then** that read includes method bodies (ingredients and steps) and is one meals query for all selected weeks, not a separate query per week.
3. **Given** the cook only browses an existing list, **When** they do not generate, **Then** browsing does not load meal methods.

---

### User Story 4 - Owner lookups stay cheap as lists grow (Priority: P3)

Listing “my lists, newest first” stays a direct lookup as the table grows, not a scan of every household’s lists.

**Why this priority**: Helps every shopping open; independent of the UI fetch behaviour.

**Independent Test**: Confirm owner-and-generated-time lookups are indexed the same way other kitchen list filters are.

**Acceptance Scenarios**:

1. **Given** shopping lists owned by different cooks, **When** a cook lists theirs newest first, **Then** the store can find those rows by owner and generated time without relying only on an unfiltered scan.

---

### Edge Cases

- Meta list request fails: show the existing error toast; do not leave a stuck spinner.
- Detail request fails: dropdown may still show names; items show the existing error toast.
- No saved lists: show the empty generate prompt; do not issue a detail read.
- Recipe deleted after the list was generated: pills may lose a live lookup; newly generated lists still keep a URL stored on the line when one existed at generate time.
- Check/uncheck and live socket edits stay as they are; this story is about first paint and generate, not live JSON patches.
- Image download size is out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Browsing shopping list names and opening one list MUST NOT run kitchen schema creation or column migration. Schema work stays on explicit setup (and writes that already ensure schema).
- **FR-002**: The shopping list index MUST return dropdown meta only: identity, name, subtitle, generated time, and recipe identities. It MUST NOT include item lines, check state, overrides, custom items, category labels, or order.
- **FR-003**: Opening Shopping MUST load that meta once and MUST load the open list’s full body once. First paint MUST NOT download every list’s item bodies in order to draw the dropdown.
- **FR-004**: Recipe source links on a shopping list MUST NOT require downloading the whole cookbook. New lists MUST store each contributing recipe’s original URL on the line when one exists. Opening an older list MAY look up URLs by the recipe identities already on that list, using card fields only.
- **FR-005**: Generating a shopping list MUST still receive full recipes (including ingredients) for the selected dinners, and MUST load those dinners in one meals read covering all selected weeks.
- **FR-006**: The store MUST support fast listing of shopping lists by owner plus generated time, newest first.

### Key Entities

- **Shopping list meta**: Enough to draw the dropdown and pick which list is open. No item body.
- **Shopping list detail**: Meta plus item lines, check state, overrides, custom items, aisle order, and enough recipe source URLs to link pills.
- **Shopping contribution**: One recipe’s wording toward a merged item, including the recipe title and optional original URL.
- **Cookbook card**: Unchanged; used only if an older list still needs a URL lookup by recipe identity. Not part of first paint.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening Shopping with several saved lists no longer shows a long empty wait caused by downloading every list’s item bodies or the whole cookbook.
- **SC-002**: A cook with a typical newest list sees items after one meta load plus one detail load for that list.
- **SC-003**: Generating a list from more than one week still includes ingredient lines from those dinners.
- **SC-004**: Recipe pills on a generated list still reach the original source when one exists, without a full cookbook download.

## Assumptions

- Kitchen tables are already created in production via setup; browse may fail closed if setup was never run.
- No new libraries. Meta vs detail is a slimmer read of the same lists, not a new store.
- Live check/uncheck JSON patches stay as they are.
- Image download size is out of scope.
- Preferences for “save dragged category” may still load on open; that payload is small and out of scope.
