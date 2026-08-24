# Feature Specification: Faster recipe list

**Feature Branch**: `011-recipe-list-speed`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Plan and implement recipe list speed-ups 1–4 and 6: do not migrate the kitchen on every list load; fetch the cookbook once (cookie decides the viewer, not a late client auth fill-in); return card fields on the list and load ingredients/steps when opening a recipe; after save patch that recipe in place instead of reloading the cookbook; add lookup indexes for owner and public visibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cookbook appears in one trip (Priority: P1)

A cook opens Recipes. They see the loading state at most once, then their cards. The page does not sit on schema setup work, and it does not load the cookbook twice while sign-in status catches up.

**Why this priority**: The noticeable wait is the first complaint. One list load with a light payload is the MVP.

**Independent Test**: Open Recipes signed in. Confirm a single cookbook request after the page is ready, cards appear, and browsing does not depend on a second identical load when the signed-in name becomes known.

**Acceptance Scenarios**:

1. **Given** a signed-in cook with recipes, **When** they open Recipes, **Then** the grid fills from one cookbook list request whose result is enough to draw cards (title, image, times, servings, tags, short description, owner, visibility, whether they can edit).
2. **Given** the session cookie is already on the browser, **When** the page learns who is signed in a moment later, **Then** the cookbook is not fetched a second time for that reason alone.
3. **Given** a cook toggles “include public library”, **When** the toggle changes, **Then** the list is fetched again with that filter (this is an intentional second request).
4. **Given** kitchen tables already exist, **When** a cook only browses Recipes, **Then** that browse does not run kitchen table-creation or column-migration work.

---

### User Story 2 - Opening a recipe still has the full method (Priority: P2)

A cook taps a card or Edit. They still see ingredients and steps. Those details load when needed, not as part of every card.

**Why this priority**: Slimming the list must not break view or edit.

**Independent Test**: Open a card and Edit. Ingredients and method are present. Saving still persists the full recipe.

**Acceptance Scenarios**:

1. **Given** the grid is showing cards, **When** the cook opens a recipe, **Then** ingredients and steps appear (loaded as a full recipe if the card did not already include them).
2. **Given** the cook hits Edit, **When** the editor opens, **Then** it is filled from the full recipe, not an empty method.
3. **Given** a guest or cook who can view a public recipe, **When** they open it, **Then** they still get the full readable recipe if they are allowed to see it.

---

### User Story 3 - Saving does not reload the whole cookbook (Priority: P2)

After create, edit, delete, duplicate, or publish, the grid updates the affected card(s) from the response. It does not download every recipe again.

**Why this priority**: Saves currently feel like opening the page again.

**Independent Test**: Edit a title and save. The card updates. The cookbook is not fully re-fetched.

**Acceptance Scenarios**:

1. **Given** a cook edits a recipe they own, **When** they save, **Then** that card updates in place and other cards stay as they were without a full list reload.
2. **Given** a cook adds a recipe, **When** save succeeds, **Then** the new card appears in the grid from the create response.
3. **Given** a cook deletes a recipe, **When** delete succeeds, **Then** that card is removed locally.
4. **Given** a cook duplicates or changes visibility, **When** the action succeeds, **Then** the grid is updated from the action’s result, not by reloading every recipe.

---

### User Story 4 - Owner and public lookups stay cheap as the library grows (Priority: P3)

Listing “my recipes” or “public recipes” stays a direct lookup as the table grows, not a full scan of every row by create-date alone.

**Why this priority**: Helps every list load; independent of the UI fetch behaviour.

**Independent Test**: Confirm owner-and-date and public-and-date lookups are indexed the same way other kitchen list filters are.

**Acceptance Scenarios**:

1. **Given** recipes owned by different cooks, **When** a cook lists their kitchen, **Then** the store can find those rows by owner and recency without relying only on a create-date index.
2. **Given** public recipes exist, **When** a guest lists the public library, **Then** the store can find public rows by visibility and recency.

---

### Edge Cases

- List request fails: show the existing error toast; do not leave a stuck spinner.
- Full-recipe request fails when opening a card: show an error; do not open an empty editor.
- Signed-out cook: one list request for public cards only (cookie absent).
- Include-public toggle off by default; turning it on is the only list refetch besides an explicit retry.
- Planner and shopping still work: they may use card fields (id, title, image, source URL) and must not require method text on the list.
- Settings ingredient dictionary still needs full ingredients; that path stays a full-recipe read, not the card list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Browsing the cookbook MUST NOT run kitchen schema creation or column migration. Schema work stays on explicit setup (and other writes that already ensure schema).
- **FR-002**: Opening Recipes MUST load the cookbook list once for a given filter. Learning who is signed in after mount MUST NOT by itself trigger another list load. The session cookie is the viewer for that request.
- **FR-003**: The cookbook list MUST return card fields only: identity, title, image, times, servings, tags, description, visibility, owner display, whether the viewer can edit, and personal rating if signed in. It MUST NOT include ingredient lines or method steps.
- **FR-004**: Opening or editing a recipe MUST load the full recipe (including ingredients and steps) when those fields are not already in memory.
- **FR-005**: Create, update, delete, duplicate, and publish/unpublish MUST update the on-screen cookbook from that action’s result (insert, replace, or remove) and MUST NOT reload the entire list.
- **FR-006**: The store MUST support fast listing by owner plus recency, and by public visibility plus recency.
- **FR-007**: Existing permission rules stay unchanged: guests see public recipes; signed-in cooks see their own by default; include-public adds others’ public recipes; only owners edit.

### Key Entities

- **Recipe card**: Enough to draw a grid tile and decide edit vs duplicate. No method body.
- **Recipe detail**: Card fields plus ingredients and steps (and notes when signed in). Used for view and edit.
- **Cookbook filter**: Viewer from the session; optional include-public flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening Recipes with a typical household cookbook (tens of recipes) no longer shows a long empty wait caused by loading every method body up front.
- **SC-002**: A cook who is already signed in sees the grid after one cookbook list load, not two, unless they change the public-library toggle.
- **SC-003**: After saving an edit, the cook sees the updated card without the whole grid blanking or re-downloading every recipe.
- **SC-004**: Opening a card still shows the full method before the cook can be asked to edit it.

## Assumptions

- Kitchen tables are already created in production via `/api/setup`; browse may fail closed if setup was never run.
- No new libraries. Card vs detail is a slimmer read of the same recipes, not a new store.
- Planner picker and shopping source-URL map can use card fields (`id`, `title`, `image_url`, `source_url`).
- Personal rating on cards may stay so the grid does not flash when a cook rates from the detail sheet.
- Image download size is out of scope (recommendation 5 from the earlier note).
