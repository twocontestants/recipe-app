# Feature Specification: Faster settings load

**Feature Branch**: `014-settings-load-speed`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Finally do the settings page the same way as recipes, planner, and shopping: no schema work on browse; do not download every recipe method to draw the ingredient dictionary; one preferences read for week-start and aisle-save; account and preference controls must not wait on the dictionary; keep writes and retag on full recipes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Account and week start appear without a cookbook wait (Priority: P1)

A cook opens Settings. They can change password, sign out, pick the week-start day, and pick how aisle changes are saved without waiting for every recipe’s method body. Ingredient rows may still fill in after that. Opening Settings does not run kitchen table-creation or column-migration work.

**Why this priority**: Account and week-start are why most cooks open Settings. The empty wait today is the dictionary scanning every recipe.

**Independent Test**: Open Settings signed in. Account and week-start controls are usable. Ingredient rows arrive from a dictionary read that does not include method steps. Browse does not migrate kitchen tables.

**Acceptance Scenarios**:

1. **Given** a signed-in cook, **When** they open Settings, **Then** account controls (who they are, change password, sign out) are usable without waiting on the ingredient dictionary.
2. **Given** that cook, **When** preferences finish loading, **Then** week-start and aisle-save match what they last saved, from one preferences read covering both.
3. **Given** kitchen tables already exist, **When** a cook only browses Settings, **Then** that browse does not run kitchen table-creation or column-migration work.
4. **Given** the cook has recipes with long methods, **When** the dictionary loads, **Then** that read includes ingredient names (and counts/examples) and does not include method steps, ratings, or notes.

---

### User Story 2 - The dictionary still lists every ingredient (Priority: P1)

A cook still sees each standardised ingredient from their own recipes, with the effective aisle, automatic guess, recipe count, and a few original wordings. Overrides that no longer appear in a recipe still show so they can be reset. Changing an aisle or resetting to automatic still sticks for new shopping lists.

**Why this priority**: Slimming the load must not drop the editor.

**Independent Test**: Open Settings with recipes and a custom aisle. Those ingredients appear. Change one aisle; generate a list; the new aisle is used. Reset still returns to the automatic guess.

**Acceptance Scenarios**:

1. **Given** owned recipes with ingredients, **When** the cook opens Settings, **Then** each standardised name appears with its aisle, count of recipes, and example wordings.
2. **Given** a custom aisle for a name that is no longer in any recipe, **When** they open Settings, **Then** that override still appears so they can change or reset it.
3. **Given** they change an aisle or reset to automatic, **When** the save completes, **Then** later shopping lists use that choice (or the automatic guess after reset).
4. **Given** the dictionary is still loading, **When** they only need account or week-start, **Then** those controls are not hidden behind the dictionary spinner.

---

### User Story 3 - Moderators can still manage roles (Priority: P2)

A Moderator still sees the account list on Settings and can grant or revoke Publisher and Moderator. That list is not required for a Cook’s first paint.

**Why this priority**: Role management already lives here; speeding first paint must not remove it.

**Independent Test**: As a Moderator, open Settings; accounts and roles appear. As a Cook, that panel is absent.

**Acceptance Scenarios**:

1. **Given** a Moderator, **When** they open Settings, **Then** they can list accounts and change roles as they do today.
2. **Given** a Cook, **When** they open Settings, **Then** they do not see the moderator account list and do not wait on it.

---

### User Story 4 - Retag still has full recipes (Priority: P3)

The maintenance path that retags recipes from their ingredients still receives full recipes, including ingredients. Settings browse does not use that heavy read.

**Why this priority**: Do not break retag while slimming Settings.

**Independent Test**: Run retag; proteins/tags still update from ingredients. Settings dictionary load does not pull method steps.

**Acceptance Scenarios**:

1. **Given** owned recipes, **When** retag runs, **Then** it still sees ingredient lines.
2. **Given** a cook only opens Settings, **When** the dictionary loads, **Then** that path is not the full-recipe list used by retag.

---

### Edge Cases

- Dictionary request fails: show the existing error toast; account and week-start stay usable.
- Preferences request fails: week-start and aisle-save stay on their current defaults; dictionary may still load.
- No recipes yet: dictionary empty state still explains that ingredients appear after recipes are added; custom overrides can still appear.
- Moderator users request fails: account and dictionary still show; role panel shows the existing error.
- Image download size is out of scope.
- Live shopping-list aisle prompts are unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Browsing Settings (preferences and the ingredient dictionary) MUST NOT run kitchen schema creation or column migration. Schema work stays on explicit setup and writes that already ensure schema.
- **FR-002**: Opening Settings MUST show account controls without waiting on the ingredient dictionary.
- **FR-003**: Week-start and aisle-save MUST load in one preferences read covering both values.
- **FR-004**: The ingredient dictionary read MUST use owned recipes’ ingredient names only. It MUST NOT include method steps, personal ratings, or personal recipe notes.
- **FR-005**: The dictionary MUST still list every standardised ingredient from the cook’s recipes plus leftover custom overrides, with effective aisle, automatic guess, recipe count, and example wordings.
- **FR-006**: Changing or resetting an aisle MUST still persist for that cook and apply to later shopping lists.
- **FR-007**: The Moderator account list MUST remain available to Moderators only and MUST NOT block a Cook’s first paint.
- **FR-008**: Recipe retag MUST still receive full recipes including ingredients.

### Key Entities

- **Settings preferences**: Week-start day and aisle-save mode for this cook, loaded together.
- **Ingredient dictionary row**: A standardised ingredient name, effective aisle, automatic aisle, whether the aisle is a custom override, how many owned recipes use it, and a few original wordings.
- **Account controls**: Signed-in identity, change password, sign out — already on Settings; not blocked by the dictionary.
- **Full recipe (retag)**: Card plus ingredients and steps. Not used to draw Settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening Settings no longer shows a long empty wait caused by downloading every method body before account or week-start can be used.
- **SC-002**: A cook with a typical library sees ingredient rows from a dictionary load that does not include method steps.
- **SC-003**: Week-start and aisle-save appear from one preferences load, not two separate kitchen setting trips.
- **SC-004**: Changing an aisle in Settings still changes later shopping lists; retag still sees ingredients.

## Assumptions

- Kitchen tables are already created in production via setup; browse may fail closed if setup was never run.
- No new libraries. Slimmer Settings reads are thinner queries of the same tables, not a new store.
- Account password and sign-out stay as they are.
- The existing recipes owner+created index is enough to find “my recipes” for the dictionary; no new table.
- Preferences GET is also used by Planner, Recipes, and Shopping; making that read one query without schema work helps those pages too and is in scope.
