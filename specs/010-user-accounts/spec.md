# Feature Specification: Per-user accounts and public recipe library

**Feature Branch**: `010-user-accounts`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Users should have access to their own recipes, settings, planner and everything which should only be shown to them once logged in. They should also be able to do a personalised rating for each recipe and custom notes. Users can also choose to save recipes publicly so there can be a toggle to include the public library of other users recipes. If not logged in, the user can still browse recipes, but if they want to add to planner or anything they they will need to log in. Sessions should be saved externally and not in local memory."

## Clarifications

### Session 2026-08-24

- Q: Who may create an account? → A: Open signup — anyone with an email can create an account.
- Q: What happens to today’s unowned household data? → A: Assign it to a seeded account whose display name and sign-in name is Jessica. That account owns the existing recipes, planner, shopping lists, and settings. The sign-in password is supplied by the host environment and is never stored in the repository or this spec.
- Q: When a cook adds someone else’s public recipe to their planner, live reference or copy? → A: Live reference. The planner picker can show public recipes (or filter to the cook’s own/private recipes). Adding it to the planner does not make it editable. To edit, the cook must create a duplicate that they then own.
- Q: Roles and who may publish? → A: Accounts have roles. Not every cook can add or edit recipes in the public library. Default signup is Cook (private kitchen only). A Publisher may mark their own recipes public and edit those public listings. A Moderator can grant or revoke Publisher (and Moderator), and can unpublish anyone’s public recipe. The seeded Jessica account is a Moderator.

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

### User Story 2 - Own recipes stay private unless a publisher shares them (Priority: P1)

A signed-in cook’s recipes belong to them. New recipes are private. Only a cook with the Publisher privilege (including Moderators) can mark their own recipe public so other people can find it. They can switch it back to private. A cook without that privilege can still create and edit private recipes, but cannot add them to the public library. Only the owner can edit the recipe’s contents; anyone else who wants a version they can change must duplicate it.

**Why this priority**: Ownership and visibility are the core of a user-based library. Publishing is a privilege, not a default.

**Independent Test**: As a Cook without publish rights, save a recipe and confirm there is no way to make it public. As a Publisher, mark one public. As a guest and as another cook, confirm only the public one is discoverable, and that only the owner can change its contents.

**Acceptance Scenarios**:

1. **Given** a signed-in cook creating or importing a recipe, **When** they save it, **Then** it is private to them by default and appears in their library.
2. **Given** a Publisher (or Moderator) and a private recipe they own, **When** they turn on “save publicly”, **Then** guests and other cooks can find it in the public library.
3. **Given** a Cook without publish rights and a recipe they own, **When** they view that recipe, **Then** they cannot mark it public.
4. **Given** a public recipe they own, **When** a Publisher turns off public sharing, **Then** it disappears from the public library and from other cooks’ public views, and remains in the owner’s library.
5. **Given** a recipe owned by cook A, **When** cook B or a guest views it, **Then** they cannot edit or delete it.
6. **Given** cook A’s public recipe, **When** another person views it, **Then** they can tell it belongs to someone else (the owner’s display name is shown).

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

### User Story 4 - Plan with public recipes; duplicate to edit (Priority: P1)

When a signed-in cook is picking something for the planner, they can see public recipes as well as their own, or filter the picker to only their private/own recipes. Adding a public recipe to a day puts that live recipe on their plan. They cannot edit it from the plan or the recipe view. If they want a version they can change, they create a duplicate, which becomes a private recipe they own.

**Why this priority**: This is how public recipes are actually used in the kitchen: cook from them, do not overwrite them.

**Independent Test**: As cook B, open add-to-planner, see a public recipe of A’s, add it to a day, confirm it is not editable, duplicate it, and confirm the duplicate is B’s private recipe and can be edited.

**Acceptance Scenarios**:

1. **Given** a signed-in cook adding to the planner, **When** the picker opens, **Then** it includes public recipes as well as recipes they own.
2. **Given** that picker, **When** they filter to private/own only, **Then** other cooks’ public recipes are hidden.
3. **Given** a public recipe they do not own, **When** they add it to a planner day, **Then** that dinner points at the live public recipe (not a silent copy).
4. **Given** that planned public recipe, **When** they try to edit ingredients or steps, **Then** they cannot; they are offered a way to duplicate it instead.
5. **Given** they duplicate it, **When** the duplicate is saved, **Then** it is a new private recipe they own, it does not replace the original on the planner unless they choose to, and they can edit the duplicate.
6. **Given** the owner later edits the public recipe, **When** another cook opens a planner dinner that still references it, **Then** they see the owner’s current version.
7. **Given** the owner unpublishes or a Moderator unpublishes that recipe, **When** another cook had it on their planner, **Then** the planned dinner remains visible as a reference they still cannot edit; it no longer appears in the public library or in the picker for new additions.

---

### User Story 5 - Personal rating and notes on a recipe (Priority: P2)

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

### User Story 6 - Guest browsing without a kitchen (Priority: P2)

Someone who is not signed in can still look through public recipes (search, open, read ingredients and steps). Anything that would change a kitchen — adding a recipe, planning a dinner, shopping lists, settings, ratings, notes — requires signing in. Personal navigation (Planner, Shopping, Settings) is hidden until they are signed in.

**Why this priority**: Browsing without an account is an explicit requirement. It is secondary to protecting each cook’s kitchen.

**Independent Test**: In a signed-out browser, open Recipes, read a public recipe, and confirm Planner/Shopping/Settings are not in the navigation. Attempt add-to-planner and confirm a sign-in prompt. After signing in, those areas appear and work.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they open the app, **Then** Recipes is available and public recipes can be opened and read.
2. **Given** a guest, **When** they look at navigation, **Then** Planner, Shopping, and Settings are not shown.
3. **Given** a guest viewing a public recipe, **When** they choose “add to planner” (or any other kitchen action), **Then** they are asked to sign in and the action does not complete until they do.
4. **Given** that guest then signs in, **When** the app reloads, **Then** Planner, Shopping, and Settings appear, and they see their own kitchen.

---

### User Story 7 - Roles: Cook, Publisher, Moderator (Priority: P2)

Accounts have a role. Open signup creates a Cook. A Cook has a private kitchen and may use the public library in the planner, but cannot publish. A Publisher may add and edit their own recipes in the public library. A Moderator can unpublish anyone’s public recipe and can grant or revoke Publisher or Moderator on other accounts. Moderators cannot open another cook’s private kitchen.

**Why this priority**: Publishing is a privilege; moderation keeps the public library in check. Role management can follow once kitchens exist.

**Independent Test**: Sign up a new account and confirm it cannot publish. As Jessica (Moderator), grant Publisher to that account and confirm they can mark a recipe public. As Moderator, unpublish someone else’s public recipe. Confirm Jessica cannot see another cook’s private planner.

**Acceptance Scenarios**:

1. **Given** a newly created account, **When** they save a recipe, **Then** they cannot mark it public.
2. **Given** a Moderator, **When** they grant Publisher to that account, **Then** that cook can mark their own recipes public and edit those public listings.
3. **Given** a Moderator, **When** they revoke Publisher, **Then** that cook’s already-public recipes stay public until unpublished, but the cook can no longer mark further recipes public or re-publish.
4. **Given** a public recipe owned by cook A, **When** a Moderator unpublishes it, **Then** it leaves the public library and becomes private to A; A still owns it.
5. **Given** a Moderator, **When** they open Recipes, Planner, or Settings, **Then** they see their own kitchen, not other cooks’ private data.
6. **Given** the seeded Jessica account, **When** accounts go live, **Then** Jessica is a Moderator and owns all previously unowned recipes, planner dinners, shopping lists, and settings.

---

### Edge Cases

- Two cooks publish recipes with the same title: both remain distinct; each is owned by its author.
- A cook or Moderator unpublishes a recipe that another cook has on their planner: the planned dinner stays, still not editable, and no longer appears for new picks from the public library.
- A cook deletes a recipe they own that others had planned: those planner dinners show as unavailable (title retained if possible) and cannot be opened; the cook can remove them from the plan.
- A cook deletes their account: their private recipes, planner, shopping lists, ratings, and notes are gone; their previously public recipes are no longer in the public library.
- Sign-in expires or is invalid: the cook is treated as a guest and can browse public recipes; personal areas stay hidden until they sign in again.
- Previously unowned household data is owned by the seeded Jessica account. Existing recipes are marked public so guests still have a library to browse; planner, shopping lists, and settings stay private to Jessica.
- A guest bookmarks a personal URL (planner, settings, a private recipe): they are asked to sign in; after signing in they only see that item if it belongs to them (or is public).
- A cook rates or notes a public recipe, then it is unpublished: ratings and notes remain for the owner; other cooks no longer see the recipe in the library (planner references they already added still show).
- Concurrent sign-in on two devices: both stay signed in as the same cook and see the same kitchen.
- Display name clash: two cooks may share a display name; ownership is still per account.
- A Cook without publish rights duplicates a public recipe: the duplicate is private and stays private until a Publisher/Moderator marks it public.
- The last Moderator cannot revoke their own Moderator role if that would leave the platform with zero Moderators.
- Jessica’s sign-in password is missing from the host environment: setup fails closed; existing data is not left unowned and no fallback password is used from source.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Anyone with an email address MUST be able to create an account (open signup), then sign in and sign out.
- **FR-002**: The system MUST keep a cook signed in across browser restarts and application restarts until they sign out or the sign-in expires. A restart of the serving process MUST NOT forget who is signed in.
- **FR-003**: Each cook MUST have their own recipes, planner, shopping lists, settings (including week-start and ingredient-category preferences), ratings, and recipe notes. Cook A MUST NOT read or change cook B’s private data.
- **FR-004**: Planner, Shopping, and Settings MUST be shown in navigation only when a cook is signed in.
- **FR-005**: Guests MUST be able to browse and open public recipes (title, ingredients, steps, timing, tags, image) without an account.
- **FR-006**: Guests MUST NOT create, edit, or delete recipes; MUST NOT add to or change the planner; MUST NOT generate or edit shopping lists; MUST NOT change settings; MUST NOT rate or add recipe notes. Attempting those actions MUST prompt sign-in instead of succeeding.
- **FR-007**: A new recipe saved by a signed-in cook MUST be owned by that cook and MUST default to private.
- **FR-008**: Only a Publisher or Moderator MUST be able to mark a recipe they own as public or private. A Cook without that privilege MUST NOT add or edit recipes in the public library.
- **FR-009**: Only the owner MUST be able to edit or delete a recipe’s contents. Viewing or planning a public recipe MUST NOT grant edit rights.
- **FR-010**: Signed-in cooks MUST have a toggle to include, or hide, other cooks’ public recipes in the recipe list. Default is off (own recipes only).
- **FR-011**: Guests’ recipe list MUST be the public library (recipes marked public by their owners).
- **FR-012**: Public recipes in a list MUST be distinguishable from the signed-in cook’s own recipes (at least by owner display name).
- **FR-013**: A signed-in cook MUST be able to set, change, and clear a personal rating on a recipe they can view (own or public). The rating is that cook’s only; it is not shown to others.
- **FR-014**: A signed-in cook MUST be able to write, edit, and clear a personal note on a recipe they can view. The note is that cook’s only; it is not shown to others.
- **FR-015**: Ratings and notes MUST persist for that cook across sessions.
- **FR-016**: A signed-in cook MUST be able to add a recipe they can view (own or public) to their own planner as a live reference. The planner picker MUST include public recipes by default and MUST offer a filter to only the cook’s own/private recipes.
- **FR-017**: Direct visits to Planner, Shopping, Settings, or a private recipe belonging to someone else MUST NOT reveal that private data to a guest or to the wrong cook.
- **FR-018**: When accounts go live, every previously unowned recipe, planner dinner, shopping list, and setting MUST belong to the seeded Jessica account. Existing recipes MUST be public so guests still have a library; planner, shopping, and settings MUST be private to Jessica. Jessica MUST be a Moderator. The Jessica sign-in password MUST come from the host environment; setup MUST fail closed if it is missing.
- **FR-019**: A signed-in cook MUST be able to duplicate a recipe they can view (including a public recipe they do not own). The duplicate MUST be a new private recipe they own and MAY edit.
- **FR-020**: New accounts MUST start as Cook (no publish privilege).
- **FR-021**: A Moderator MUST be able to grant and revoke Publisher and Moderator on other accounts, and MUST be able to unpublish any public recipe. Moderators MUST NOT read other cooks’ private kitchens.
- **FR-022**: The system MUST refuse to leave the platform with zero Moderators.

### Key Entities

- **Account**: A person who can sign in. Has a display name, sign-in identity, and a role (Cook, Publisher, or Moderator). Owns a private kitchen.
- **Role**: Cook (default) — private kitchen, may use public recipes on the planner, cannot publish. Publisher — may mark own recipes public and edit those public listings. Moderator — Publisher plus unpublish-anyone and grant/revoke roles.
- **Sign-in session**: Proof that this browser is that account. Survives closing the browser and restarting the app; ends on sign-out or expiry. Not held only in process memory.
- **Recipe**: A dish with ingredients, steps, and the usual library fields, plus an owner and a public/private visibility. Default visibility is private.
- **Public library**: The set of recipes whose owners (with publish privilege) have marked them public. Visible to guests and to signed-in cooks who opt in (and in the planner picker).
- **Duplicate**: A new private recipe owned by the cook who copied it, independent of the original.
- **Personal rating**: One cook’s rating of one recipe. Invisible to every other cook.
- **Personal recipe note**: One cook’s free-text note on one recipe. Invisible to every other cook. Distinct from a planner day note.
- **Private kitchen**: That cook’s planner dinners, planner day notes, shopping lists, and settings.
- **Jessica account**: Seeded Moderator who owns all previously unowned household data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two cooks can use the app on the same installation without ever seeing each other’s private recipes, planner, shopping lists, ratings, notes, or settings (zero private items leaked in a cross-account check).
- **SC-002**: A cook who signs in, closes the browser, and returns within the normal sign-in lifetime is still signed in on first load — no extra sign-in step — including after the app itself has been restarted.
- **SC-003**: A guest can open and read a public recipe in under 30 seconds from landing on the app, with no account required.
- **SC-004**: A Publisher can mark a recipe public or private in one action from the recipe, and a second person sees the change on their next view of the public library. A Cook without that privilege cannot complete that action.
- **SC-005**: 100% of kitchen-changing actions attempted while signed out (add recipe, add to planner, shopping, settings, rate, note) result in a sign-in prompt rather than a successful change.
- **SC-006**: A signed-in cook can set a personal rating and a note on a recipe in under a minute, and both are still there after they sign out and sign back in.
- **SC-007**: With the public-library toggle off, a cook’s recipe list contains only recipes they own; turning it on adds other cooks’ public recipes without removing their own.
- **SC-008**: From the planner picker, a cook can add someone else’s public recipe to a day in one action, cannot edit that recipe, and can produce an editable private duplicate in one further action.
- **SC-009**: After accounts go live, signing in as Jessica shows the previously shared kitchen (recipes, planner, shopping, settings). Signing in as anyone else does not.

## Assumptions

- Sign-in for new accounts is email address plus password (open self-service). Password reset via email is in scope so a cook is not locked out.
- The seeded Jessica account signs in with the name Jessica. Its password is provided by the host environment and is never committed.
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
- Moderators moderate the public library and roles only; they are not a back door into private kitchens.
- “Add or edit recipes publicly” means contributing to the public library, not creating private recipes. Every signed-in cook can still add and edit their own private recipes.
- Role grant/revoke lives in Settings for Moderators.
