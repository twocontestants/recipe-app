# Feature Specification: Remove public recipes

**Feature Branch**: `017-remove-public-recipes`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "rearchitect to remove the public recipes. what we'll do in future is just give people a defined set of starter recipes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Private kitchen only (Priority: P1)

A signed-in cook’s recipe list shows only recipes they own. There is no toggle to include other cooks’ recipes, no “public library,” and no way to mark a recipe public. The planner picker lists only that cook’s recipes.

**Why this priority**: This is the core product shift — kitchens are personal, not a shared public catalog.

**Independent Test**: Sign in as cook A with private recipes and (if any remain) recipes previously marked public. Confirm the list is only A’s recipes, there is no include-public control, and the planner picker never shows B’s recipes.

**Acceptance Scenarios**:

1. **Given** a signed-in cook, **When** they open Recipes, **Then** they see only recipes they own and the page title reflects their cookbook (not a public library).
2. **Given** a signed-in cook, **When** they look for an “include public library” (or similar) control, **Then** it is not present.
3. **Given** a signed-in cook opening the planner picker, **When** the picker loads, **Then** it lists only recipes they own.
4. **Given** a recipe they own, **When** they open it, **Then** there is no Make public / Make private / Public recipe sharing action.

---

### User Story 2 - Guests cannot browse recipes (Priority: P1)

Someone who is not signed in cannot browse a public recipe library, because that library no longer exists. Kitchen areas that need recipes require sign-in.

**Why this priority**: Removing the public library without locking guest browse would leave an empty or confusing guest experience.

**Independent Test**: In a signed-out browser, open Recipes and confirm they are asked to sign in (or otherwise cannot read other cooks’ recipes). After signing in, their own cookbook works.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they open Recipes, **Then** they are directed to sign in rather than browsing a public catalog.
2. **Given** a guest, **When** they attempt to open a recipe by direct link, **Then** they cannot read it unless they own it after signing in.
3. **Given** a guest, **When** they sign in, **Then** they see only their own recipes.

---

### User Story 3 - Publishing roles and controls go away (Priority: P2)

Publisher is no longer a meaningful role for sharing. Moderators no longer unpublish other people’s recipes. Settings no longer explain or grant “Publisher so a cook can share recipes publicly.”

**Why this priority**: Leftover publish UI and roles would contradict the new model and confuse cooks.

**Independent Test**: As a moderator, open Settings and confirm there is no Publisher grant tied to public sharing. Open a recipe page and confirm no publish/unpublish controls exist for anyone.

**Acceptance Scenarios**:

1. **Given** a moderator in Settings, **When** they manage another account’s role, **Then** they cannot assign Publisher for the purpose of public sharing (Publisher is gone or unused).
2. **Given** any signed-in cook viewing a recipe, **When** they look for publish/unpublish, **Then** those actions are absent.
3. **Given** copy that described the public library or granting Publisher to share publicly, **When** a cook reads Settings or product docs in-app, **Then** that copy is gone or rewritten for private kitchens.

---

### User Story 4 - Existing public recipes become private (Priority: P1)

Recipes that were previously public become private to their owner. Other cooks who had planned a formerly public recipe keep the planner reference only if they can still access it under private rules (they cannot — so those planner entries behave as inaccessible / removed from usable view per existing private ownership rules). Owners still see and edit their recipes.

**Why this priority**: Data left public would reopen the library after the rearchitecture.

**Independent Test**: Start from a recipe that was public under the old model; after the change, only the owner can open it; guests and other cooks cannot.

**Acceptance Scenarios**:

1. **Given** a recipe that was public, **When** the change is applied, **Then** only its owner can view and edit it.
2. **Given** that formerly public recipe, **When** another cook or a guest tries to open it, **Then** they are denied.
3. **Given** the owner of a formerly public recipe, **When** they open Recipes, **Then** the recipe still appears in their cookbook as a normal private recipe.

---

### Edge Cases

- A cook had Publisher role: they keep a normal cook (or moderator) account; they simply cannot publish.
- A planner day still points at another cook’s formerly public recipe: the cook cannot use that recipe as if it were theirs; ownership rules apply (no cross-kitchen read).
- Duplicate-to-edit for someone else’s public recipe: no longer needed for cross-user public recipes; duplicating one’s own recipe may remain as a personal copy action if already supported for owned recipes.
- Deep links to formerly public recipes from outside: guests and non-owners get sign-in / not-found / forbidden, not readable content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every recipe MUST be private to its owner. The product MUST NOT offer a public recipe library or a public visibility state for sharing.
- **FR-002**: Recipe lists and the planner recipe picker MUST show only recipes owned by the signed-in cook.
- **FR-003**: Guests MUST NOT be able to browse or open recipes. Recipe browsing requires sign-in.
- **FR-004**: The product MUST NOT expose publish, unpublish, or “include public library” controls.
- **FR-005**: Recipes that were previously public MUST become private to their existing owner without deleting content the owner still needs.
- **FR-006**: Role management MUST NOT grant a Publisher role for public sharing. Account roles that remain MUST support private kitchens (and moderator account management if that already exists for non-publish reasons).
- **FR-007**: Product copy (in-app and README-level overview) MUST describe per-cook private kitchens, not a guest-browsable public library.
- **FR-008**: Defined starter recipes for new accounts are OUT OF SCOPE for this change and MUST NOT be implemented here; they are future work.

### Key Entities

- **Recipe**: Belongs to one owner; always private; no cross-user public visibility.
- **Cook account**: Owns a private kitchen (recipes, planner, shopping, settings).
- **Moderator** (if retained): May manage account roles for admin purposes; does not moderate a public recipe library.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a signed-out session, a tester cannot open and read any recipe content without signing in.
- **SC-002**: With two cooks each owning recipes, neither cook’s recipe list or planner picker includes the other’s recipes (0 cross-kitchen listings).
- **SC-003**: A formerly public recipe is viewable by its owner and by nobody else in under one verification pass.
- **SC-004**: Publish / unpublish / include-public controls are absent from Recipes list, recipe detail, Settings role copy, and planner picker in a full UI pass.
- **SC-005**: Automated tests that previously asserted public-library behavior are updated or removed so the suite passes under the private-only model.

## Assumptions

- “Starter recipes” means a future curated set copied into a new cook’s kitchen; that work is explicitly deferred.
- Duplicate remains useful for copying one’s own recipe if the app already offers it for owned recipes; cross-user “duplicate to edit” for public recipes goes away with public access.
- Moderator can remain for granting/revoking moderator (or similar admin) on accounts; Publisher as a publish-to-library role is removed.
- Existing planner rows that reference another cook’s recipe become unusable for reading that recipe; no automated rewrite of those rows is required beyond access denial.
- Visibility storage may remain internally as always-private during migration; cooks must not see or set public sharing.
