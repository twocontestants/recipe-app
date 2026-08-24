# Tasks: Faster settings load

**Input**: Design documents from `/specs/014-settings-load-speed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution III (test-first) and plan.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create `lib/settingsLoad.ts` with exported stubs (`ownedIngredientsSelectSql`, `aggregateIngredientDictionary`, `PREFERENCE_KEYS`)

---

## Phase 2: Foundational (Blocking)

- [x] T002 [P] Write failing tests in `lib/settingsLoad.test.ts` for ingredients-only SELECT (no steps), dictionary counts/examples/leftover overrides, and preference key list
- [x] T003 Implement those helpers in `lib/settingsLoad.ts`

**Checkpoint**: `npm test` covers SELECT shape and dictionary aggregation

---

## Phase 3: User Story 1 - Account and week start appear without a cookbook wait (P1) 🎯 MVP

**Goal**: Browse GET is session + one preferences query + ingredients-only dictionary. No schema migrate. Account/week-start not behind the dictionary spinner.

**Independent Test**: Open Settings; account usable; one preferences GET; dictionary GET has no steps.

- [x] T004 [US1] Add `listOwnedIngredientLines` and `getAppSettings` in `lib/db.ts` with no `ensureAccountsSchema` / table-create; `getAppSetting` and `getCategoryDictionary` become reads
- [x] T005 [US1] `GET` in `app/api/preferences/route.ts` uses one `getAppSettings` call
- [x] T006 [US1] Confirm `app/settings/SettingsClient.tsx` keeps AccountSettings and week-start / aisle-save outside the dictionary spinner and does not refetch when `user` hydrates

**Checkpoint**: Prefs are one query; browse GET does not migrate schema

---

## Phase 4: User Story 2 - The dictionary still lists every ingredient (P1)

**Goal**: Dictionary GET uses owned ingredient lines + overrides; same response shape.

**Independent Test**: Ingredients, leftover overrides, aisle change/reset still work.

- [x] T007 [US2] `GET` in `app/api/ingredient-categories/route.ts` uses `listOwnedIngredientLines` + `aggregateIngredientDictionary`; PUT/DELETE unchanged

**Checkpoint**: Dictionary payload matches today without full recipes

---

## Phase 5: User Story 3 - Moderators can still manage roles (P2)

- [x] T008 [US3] Keep ModeratorPanel behind `isModerator`; Cooks do not fetch `/api/auth/users`

**Checkpoint**: Role list is moderator-only

---

## Phase 6: User Story 4 - Retag still has full recipes (P3)

- [x] T009 [US4] Keep `listRecipes` on `GET` in `app/api/recipes/retag/route.ts`

**Checkpoint**: Settings is ingredients-only; retag is full

---

## Phase 7: Polish

- [x] T010 Confirm Planner/Recipes/Shopping still consume `GET /api/preferences`; run `npm test` and gitleaks

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (MVP) → US2 → US3 / US4 → Polish
- T002 before T003. T003 and T004 before T005 and T007.

## Implementation Strategy

1. Tests for `lib/settingsLoad.ts` then implementation
2. Read-only db helpers; preferences one query; dictionary GET
3. Confirm client spinner scope, retag, secret scan
4. `npm test` + gitleaks
