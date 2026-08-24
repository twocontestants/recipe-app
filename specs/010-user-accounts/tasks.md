# Tasks: Per-user accounts and public recipe library

**Input**: Design documents from `/specs/010-user-accounts/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution III (test-first for behavior) and plan.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Env placeholders and module files the rest of the feature will fill

- [ ] T001 Add `BOOTSTRAP_OWNER_PASSWORD` placeholder (empty, no real secret) to `.env.local.example`
- [ ] T002 [P] Create empty helper modules `lib/auth.ts`, `lib/roles.ts`, `lib/visibility.ts`

---

## Phase 2: Foundational

**Purpose**: Users, sessions in Postgres, password hashing, request auth. Blocks all stories.

**⚠️ CRITICAL**: No user story work until this phase is complete

- [ ] T003 [P] Write failing tests for scrypt hash/verify and session id format in `lib/auth.test.ts`
- [ ] T004 [P] Write failing tests for Cook/Publisher/Moderator rules in `lib/roles.test.ts`
- [ ] T005 Implement password hash, session id, and cookie helpers in `lib/auth.ts`
- [ ] T006 Implement role helpers in `lib/roles.ts`
- [ ] T007 Extend `setupDatabase` in `lib/db.ts` to create `users` and `sessions` tables
- [ ] T008 Seed Jessica from `BOOTSTRAP_OWNER_PASSWORD` (fail closed if missing) in `lib/db.ts`
- [ ] T009 Add `getUserByLogin`, `createUser`, `createSession`, `getSessionUser`, `deleteSession` in `lib/db.ts`
- [ ] T010 Add `requireUser` / `optionalUser` request helpers in `lib/session.ts`
- [ ] T011 Implement `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` under `app/api/auth/`

**Checkpoint**: Register, login, logout, me work; sessions survive process restart

---

## Phase 3: User Story 1 - Sign in to a private kitchen (P1) 🎯 MVP

**Goal**: Each cook’s recipes, planner, shopping, settings are isolated. Guests do not see personal nav.

**Independent Test**: Two accounts; A’s private kitchen never appears for B; guest has no Planner/Shopping/Settings.

- [ ] T012 [P] [US1] Write failing tests for owner scoping helpers in `lib/visibility.test.ts`
- [ ] T013 [US1] Add `owner_id` to recipes, meal_plans, planner_notes, shopping_lists, app_settings, ingredient_categories in `lib/db.ts` and backfill Jessica
- [ ] T014 [US1] Scope all kitchen queries in `lib/db.ts` by `owner_id`
- [ ] T015 [US1] Require session on planner, shopping, settings, preferences, categories, scrape, parse, retag routes under `app/api/`
- [ ] T016 [US1] Add login/register UI in `app/login/page.tsx` and hide Planner/Shopping/Settings in `components/Sidebar.tsx` until signed in
- [ ] T017 [US1] Join Socket.IO planner rooms per user in `server.js`

**Checkpoint**: Signed-in cook sees only their kitchen; guests cannot open personal APIs

---

## Phase 4: User Story 2 - Own recipes stay private unless a publisher shares them (P1)

**Goal**: Recipes default private. Only Publisher/Moderator can mark their own recipe public. Others cannot edit.

**Independent Test**: Cook cannot publish; Publisher can; guest sees only public; non-owner cannot PUT.

- [ ] T018 [P] [US2] Write failing tests for publish/edit rules in `lib/visibility.test.ts`
- [ ] T019 [US2] Add `visibility` on recipes and `canEditRecipe` / `canPublish` in `lib/visibility.ts`
- [ ] T020 [US2] Enforce GET/PUT/DELETE visibility in `app/api/recipes/route.ts` and `app/api/recipes/[id]/route.ts`
- [ ] T021 [US2] Add publish/unpublish endpoints in `app/api/recipes/[id]/publish/route.ts` and `unpublish/route.ts`
- [ ] T022 [US2] Show owner name and hide edit for non-owners in `app/recipes/RecipesClient.tsx`

**Checkpoint**: Private recipes leak to nobody; publish is a privilege

---

## Phase 5: User Story 3 - Toggle the public library in the recipe list (P1)

**Goal**: Signed-in list is own recipes; toggle includes others’ public recipes. Guests see public only.

**Independent Test**: Toggle off = own only; on = own + public; guest = public.

- [ ] T023 [P] [US3] Write failing tests for list filter (`owned`, `includePublic`, guest) in `lib/visibility.test.ts`
- [ ] T024 [US3] Implement list filters on `GET /api/recipes` in `app/api/recipes/route.ts`
- [ ] T025 [US3] Add “Include public library” toggle (default off) in `app/recipes/RecipesClient.tsx`

**Checkpoint**: Library toggle matches spec SC-007

---

## Phase 6: User Story 4 - Plan with public recipes; duplicate to edit (P1)

**Goal**: Planner picker shows public recipes (filter to own). Add is a live reference. Duplicate to edit.

**Independent Test**: Add public recipe to a day; cannot edit; duplicate is a private owned copy.

- [ ] T026 [P] [US4] Write failing tests for duplicate field copy (no owner/visibility leak) in `lib/visibility.test.ts`
- [ ] T027 [US4] Implement `duplicateRecipe` in `lib/db.ts` and `POST /api/recipes/[id]/duplicate/route.ts`
- [ ] T028 [US4] Allow planner POST to reference any viewable recipe in `app/api/planner/route.ts`
- [ ] T029 [US4] Planner picker includes public recipes with owned-only filter in `components/AddToPlannerModal.tsx`
- [ ] T030 [US4] Block edit of non-owned recipes and offer Duplicate in `app/recipes/RecipesClient.tsx` and planner menus

**Checkpoint**: Live reference + explicit duplicate

---

## Phase 7: User Story 5 - Personal rating and notes (P2)

**Goal**: Per-cook rating (1–5) and note on any viewable recipe; not shown to others.

**Independent Test**: A’s rating/note absent for B on the same public recipe.

- [ ] T031 [P] [US5] Add `recipe_ratings` and `recipe_notes` tables plus getters/setters in `lib/db.ts`
- [ ] T032 [US5] Implement `PUT /api/recipes/[id]/rating/route.ts` and `PUT /api/recipes/[id]/notes/route.ts`
- [ ] T033 [US5] Rating stars and notes UI on the recipe view in `app/recipes/RecipesClient.tsx`

**Checkpoint**: Ratings/notes persist per account

---

## Phase 8: User Story 6 - Guest browsing without a kitchen (P2)

**Goal**: Guests browse public recipes; kitchen actions prompt sign-in.

**Independent Test**: Signed-out browser can read a public recipe; add-to-planner goes to login.

- [ ] T034 [US6] Guest-safe recipe browse and sign-in prompts on kitchen actions in `app/recipes/RecipesClient.tsx` and `app/login/page.tsx`
- [ ] T035 [US6] Redirect unsigned visits to `/planner`, `/shopping-list`, `/settings` toward login in those `page.tsx` files

**Checkpoint**: SC-005 — kitchen actions while signed out prompt sign-in

---

## Phase 9: User Story 7 - Roles: Cook, Publisher, Moderator (P2)

**Goal**: Signup is Cook. Moderator grants Publisher/Moderator and can unpublish anyone. Jessica is Moderator.

**Independent Test**: New account cannot publish until Jessica grants Publisher; moderator unpublish works; last moderator cannot be demoted.

- [ ] T036 [P] [US7] Write failing tests for last-moderator protection in `lib/roles.test.ts`
- [ ] T037 [US7] Implement `PATCH /api/auth/users/[id]/role/route.ts` and list users for moderators
- [ ] T038 [US7] Moderator role + unpublish UI in `app/settings/SettingsClient.tsx`

**Checkpoint**: Role model matches FR-020–FR-022

---

## Phase 10: Polish

- [ ] T039 [P] Update README.md setup with Jessica bootstrap env (no real password)
- [ ] T040 Run `npm test` and gitleaks; confirm no password or session secret in source
- [ ] T041 Walk guest / Jessica / second-account flows against `specs/010-user-accounts/quickstart.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks all stories) → US1 → US2 → US3 → US4 → US5 / US6 → US7 → Polish
- US5 and US6 can proceed in parallel after US4
- US7 needs US2 publish endpoints

## Parallel opportunities

- T003 / T004 (tests)
- T018 / T023 / T026 (visibility tests in later stories after T012 exists — sequential if same file)
- T031 vs T034 (different files)

## MVP

Phases 1–3 (foundation + private kitchens). Then publish, public library toggle, planner duplicate.

## Implementation strategy

1. Setup + foundational auth
2. Owner-scoped kitchens (US1)
3. Visibility + publish privilege (US2–US3)
4. Planner live reference + duplicate (US4)
5. Ratings/notes, guest UX, roles
