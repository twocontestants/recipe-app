# Feature Specification: Per-user accounts and public recipe library

**Feature Branch**: `010-user-accounts`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Users should have access to their own recipes, settings, planner and everything which should only be shown to them once logged in. They should also be able to do a personalised rating for each recipe and custom notes. Users can also choose to save recipes publicly so there can be a toggle to include the public library of other users recipes. If not logged in, the user can still browse recipes, but if they want to add to planner or anything they they will need to log in. Sessions should be saved externally and not in local memory."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in to a private kitchen (Priority: P1)

A cook creates an account (or signs in to an existing one) and immediately sees only their own recipes, planner, shopping lists, and settings. Another cook on a different account never sees the first cook’s private kitchen. Closing the browser or restarting the app does not sign them out.

**Why this priority**: Without a durable signed-in identity, none of the personal library, planner, or ratings work can exist. Shared household data is no longer acceptable.

**Independent Test**: Create two accounts. Add a recipe, a planned dinner, a shopping list, and a settings change as cook A. Sign in as cook B: none of A’s private items appear. Sign out, close the browser, return as A: A’s kitchen is still there.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they open the app, **Then** they can browse recipes that are public, and they cannot see Planner, Shopping, or Settings.
2. **Given** a visitor, **When** they try to add a recipe, add to the planner, rate, or leave a note, **Then** they are asked to sign in (or create an account) before the action completes.
3. **Given** cook A is signed in, **When** they open Recipes, Planner, Shopping, or Settings, **Then** they see only their own private data (plus public recipes if they have opted to include the public library).
4. **Given** cook A is signed in, **When** they close the browser and return later, or the app is restarted, **Then** they are still signed in until they sign out or the sign-in expires.
5. **Given** cook B is signed in, **When** they open any personal area, **Then** they never see cook A’s private recipes, planner, shopping lists, notes, ratings, or settings.

---

### User Story 2 - Own recipes stay private unless published (Priority: P1)

A signed-in cook’s recipes belong to them. New recipes are private. The cook can choose to make a recipe public so other people can find it in the public library. They can switch it back to private. Only the owner can edit or delete it.

**Why this priority**: Ownership and visibility are the core of a user-based library. Mixing everyone into one list is the current problem.

**Independent Test**: As cook A, save a private recipe and a public recipe. As a guest and as cook B (with the public-library toggle off, then on), confirm only the public one is discoverable by others, and that only A can change it.

**Acceptance Scenarios**:

1. **Given** a signed-in cook creating or importing a recipe, **When** they save it, **Then** it is private to them by default and appears in their library.
2. **Given** a private recipe they own, **When** they turn on “save publicly”, **Then** guests and other cooks can find it in the public library.
3. **Given** a public recipe they own, **When** they turn off public sharing, **Then** it disappears from the public library and from other cooks’ “include public library” view, and remains in the owner’s library.
4. **Given** a recipe owned by cook A, **When** cook B or a guest views it, **Then** they cannot edit or delete it.
5. **Given** cook A’s public recipe, **When** another person views it, **Then** they can tell it belongs to someone else (the owner’s display name is shown).

---

### User Story 3 - Toggle the public library in the recipe list (Priority: P1)

A signed-in cook’s recipe list is their own library. They can turn on a toggle to also include public recipes saved by other cooks. Turning it off returns them to only their recipes. Guests have no private library, so they browse the public library.

**Why this priority**: This is the stated way to mix personal cooking with other people’s published recipes without polluting the default list.

**Independent Test**: Own three private recipes and confirm a fourth public recipe from someone else appears only when the toggle is on. As a guest, confirm only public recipes are listed.

**Acceptance Scenarios**:

1. **Given** a signed-in cook with the public-library toggle off, **When** they open Recipes, **Then** they see only recipes they own.
2. **Given** that cook, **When** they turn the toggle on, **Then** the list also includes other cooks’ public recipes, clearly distinguished from their own.
3. **Given** the toggle on, **When** they turn it off, **Then** other cooks’ public recipes disappear from the list and their own remain.
4. **Given** a guest (not signed in), **When** they open Recipes, **Then** they see public recipes only.

---

### User Story 4 - Personal rating and notes on a recipe (Priority: P2)

A signed-in cook can give each recipe their own rating and a private note (tips, tweaks, “kids hated this”). Those are for that cook only. They work on recipes they own and on public recipes they are viewing. Guests cannot rate or note.

**Why this priority**: Ratings and notes are the personal layer on top of ownership. They are valuable once a cook has a library, but the app is still usable without them.

**Independent Test**: As cook A, rate a recipe 4 stars and write a note. As cook B viewing the same public recipe, A’s rating and note are absent; B can add a different rating and note. After sign-out, neither appears.

**Acceptance Scenarios**:

1. **Given** a signed-in cook viewing a recipe, **When** they set a rating, **Then** that rating is saved for them on that recipe and shown when they return.
2. **Given** a signed-in cook viewing a recipe, **When** they write or edit a note, **Then** the note is saved for them on that recipe and shown when they return.
3. **Given** cook A’s rating and note on a recipe, **When** cook B opens the same recipe, **Then** B does not see A’s rating or note.
4. **Given** a guest viewing a recipe, **When** they try to rate or add a note, **Then** they are asked to sign in first.
5. **Given** a cook who has not rated a recipe, **When** they open it, **Then** they can still view it; rating and note are optional.

---

### User Story 5 - Guest browsing without a kitchen (Priority: P2)

Someone who is not signed in can still look through public recipes (search, open, read ingredients and steps). Anything that would change a kitchen — adding a recipe, planning a dinner, shopping lists, settings, ratings, notes — requires signing in. Personal navigation (Planner, Shopping, Settings) is hidden until they are signed in.

**Why this priority**: Browsing without an account is an explicit requirement. It is secondary to protecting each cook’s kitchen.

**Independent Test**: In a signed-out browser, open Recipes, read a public recipe, and confirm Planner/Shopping/Settings are not in the navigation. Attempt add-to-planner and confirm a sign-in prompt. After signing in, those areas appear and work.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they open the app, **Then** Recipes is available and public recipes can be opened and read.
2. **Given** a guest, **When** they look at navigation, **Then** Planner, Shopping, and Settings are not shown.
3. **Given** a guest viewing a public recipe, **When** they choose “add to planner” (or any other kitchen action), **Then** they are asked to sign in and the action does not complete until they do.
4. **Given** that guest then signs in, **When** the app reloads, **Then** Planner, Shopping, and Settings appear, and they see their own kitchen.

---

### Edge Cases

- Two cooks publish recipes with the same title: both remain distinct; each is owned by its author.
- A cook unpublishes a recipe that another cook currently has on their planner: [NEEDS CLARIFICATION: whether planning a public recipe copies it into the planner’s kitchen or points at the live public recipe — this decides whether unpublishing/deleting breaks other people’s plans].
- A cook deletes their account: their private recipes, planner, shopping lists, ratings, and notes are gone; their previously public recipes are no longer in the public library.
- A cook deletes a recipe they own: it leaves their library and, if it was public, the public library.
- Sign-in expires or is invalid: the cook is treated as a guest and can browse public recipes; personal areas stay hidden until they sign in again.
- Existing recipes, planner rows, shopping lists, and settings in the app today have no owner: [NEEDS CLARIFICATION: what happens to that current household data when accounts are introduced].
- A guest bookmarks a personal URL (planner, settings, a private recipe): they are asked to sign in; after signing in they only see that item if it belongs to them (or is public).
- A cook rates or notes a public recipe, then the owner unpublishes it: the cook’s rating and note remain attached to that recipe for them if they can still open it as owner; if they cannot open it, the rating and note are simply not shown.
- Concurrent sign-in on two devices: both stay signed in as the same cook and see the same kitchen.
- Display name clash: two cooks may share a display name; ownership is still per account.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a person to create an account and to sign in and sign out. [NEEDS CLARIFICATION: who may create an account — open self-service signup, invite-only, or a single first account that then invites others].
- **FR-002**: The system MUST keep a cook signed in across browser restarts and application restarts until they sign out or the sign-in expires. A restart of the serving process MUST NOT forget who is signed in.
- **FR-003**: Each cook MUST have their own recipes, planner, shopping lists, settings (including week-start and ingredient-category preferences), ratings, and recipe notes. Cook A MUST NOT read or change cook B’s private data.
- **FR-004**: Planner, Shopping, and Settings MUST be shown in navigation only when a cook is signed in.
- **FR-005**: Guests MUST be able to browse and open public recipes (title, ingredients, steps, timing, tags, image) without an account.
- **FR-006**: Guests MUST NOT create, edit, or delete recipes; MUST NOT add to or change the planner; MUST NOT generate or edit shopping lists; MUST NOT change settings; MUST NOT rate or add recipe notes. Attempting those actions MUST prompt sign-in instead of succeeding.
- **FR-007**: A new recipe saved by a signed-in cook MUST be owned by that cook and MUST default to private.
- **FR-008**: The owner MUST be able to mark a recipe public or private at any time.
- **FR-009**: Only the owner MUST be able to edit or delete a recipe.
- **FR-010**: Signed-in cooks MUST have a toggle to include, or hide, other cooks’ public recipes in the recipe list. Default is off (own recipes only).
- **FR-011**: Guests’ recipe list MUST be the public library (recipes marked public by their owners).
- **FR-012**: Public recipes in a list MUST be distinguishable from the signed-in cook’s own recipes (at least by owner display name).
- **FR-013**: A signed-in cook MUST be able to set, change, and clear a personal rating on a recipe they can view (own or public). The rating is that cook’s only; it is not shown to others.
- **FR-014**: A signed-in cook MUST be able to write, edit, and clear a personal note on a recipe they can view. The note is that cook’s only; it is not shown to others.
- **FR-015**: Ratings and notes MUST persist for that cook across sessions.
- **FR-016**: A signed-in cook MUST be able to add a recipe they can view (own or public) to their own planner. [NEEDS CLARIFICATION: adding someone else’s public recipe to the planner — live reference vs personal copy — see Edge Cases].
- **FR-017**: Direct visits to Planner, Shopping, Settings, or a private recipe belonging to someone else MUST NOT reveal that private data to a guest or to the wrong cook.
- **FR-018**: Existing unowned household data MUST be handled in a single, explicit way when accounts go live. [NEEDS CLARIFICATION: assign to the first account, treat as public library, hide until claimed, or another rule].

### Key Entities

- **Account**: A cook who can sign in. Has a display name and sign-in identity. Owns a private kitchen.
- **Sign-in session**: Proof that this browser is that cook. Survives closing the browser and restarting the app; ends on sign-out or expiry.
- **Recipe**: A dish with ingredients, steps, and the usual library fields, plus an owner and a public/private visibility. Default visibility is private.
- **Public library**: The set of recipes whose owners have marked them public. Visible to guests and to signed-in cooks who opt in.
- **Personal rating**: One cook’s rating of one recipe. Invisible to every other cook.
- **Personal recipe note**: One cook’s free-text note on one recipe. Invisible to every other cook. Distinct from a planner day note (which stays a note on a kitchen day in that cook’s planner).
- **Private kitchen**: That cook’s planner dinners, planner day notes, shopping lists, and settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two cooks can use the app on the same installation without ever seeing each other’s private recipes, planner, shopping lists, ratings, notes, or settings (zero private items leaked in a cross-account check).
- **SC-002**: A cook who signs in, closes the browser, and returns within the normal sign-in lifetime is still signed in on first load — no extra sign-in step — including after the app itself has been restarted.
- **SC-003**: A guest can open and read a public recipe in under 30 seconds from landing on the app, with no account required.
- **SC-004**: A signed-in cook can mark a recipe public or private in one action from the recipe, and a second person sees the change on their next view of the public library.
- **SC-005**: 100% of kitchen-changing actions attempted while signed out (add recipe, add to planner, shopping, settings, rate, note) result in a sign-in prompt rather than a successful change.
- **SC-006**: A signed-in cook can set a personal rating and a note on a recipe in under a minute, and both are still there after they sign out and sign back in.
- **SC-007**: With the public-library toggle off, a cook’s recipe list contains only recipes they own; turning it on adds other cooks’ public recipes without removing their own.

## Assumptions

- Sign-in is email address plus password (self-service). Password reset via email is in scope so a cook is not locked out.
- Sign-in lifetime is measured in weeks of inactivity, not minutes; cooks should not have to sign in every shopping trip.
- Ratings use a 1–5 star scale; a cook may clear their rating.
- Personal recipe notes are plain text, private, and unlimited in everyday kitchen length (a few paragraphs is enough; no rich documents).
- There is no household-sharing, commenting, following, or public review feed in this feature. “Personalised rating” means private to the cook.
- Display name is chosen at account creation and shown on that cook’s public recipes.
- Ingredient-category dictionary and week-start remain kitchen settings, now per cook, not global.
- Planner day notes stay on the cook’s planner days; they are not the same thing as personal recipe notes.
- Guests do not have a public-library toggle because the guest list is already only public recipes.
- Constitution “household-first UX” still applies to layout and kitchen use; data is now per signed-in cook rather than one shared household.
- OAuth / social sign-in is out of scope unless specified later.
- This feature does not change how a planned dinner’s calendar day is stored (still a YYYY-MM-DD kitchen day).
