# Tasks: Faster shopping list load

**Input**: Design documents from `/specs/013-shopping-list-speed/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — constitution III (test-first) and plan.md.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Create `lib/shoppingList.ts` with exported stubs (`shoppingListMetaSelectSql`, `toShoppingListMeta`, `recipeSourceMapFromItems`, `recipeSourceMapFromRecipes`, `mergeRecipeSourceMaps`)

---

## Phase 2: Foundational (Blocking)

- [x] T002 [P] Write failing tests in `lib/shoppingList.test.ts` for meta SELECT columns (no item JSONB) and title→URL maps
- [x] T003 [P] Write failing tests in `lib/shopping.test.ts` that generate copies `source_url` onto contributions
- [x] T004 Implement meta SELECT helpers and source maps in `lib/shoppingList.ts`; copy `source_url` in `generateShoppingList` in `lib/shopping.ts`

**Checkpoint**: `npm test` covers meta SELECT, source maps, and generate URLs

---

## Phase 3: User Story 1 - The open list appears without a heavy index (P1) 🎯 MVP

**Goal**: Browse is session + meta SELECT. No schema migrate. Dropdown has no item bodies. Open list is one detail GET.

**Independent Test**: Open Shopping; meta GET has no items; one detail GET for the newest list.

- [x] T005 [US1] `getAllShoppingLists` in `lib/db.ts` uses `shoppingListMetaSelectSql` and does not call `ensureAccountsSchema`; return meta only
- [x] T006 [US1] `GET` without `id` in `app/api/shopping-lists/route.ts` stays on `getAllShoppingLists`; `GET ?id=` stays on `getShoppingListById` (no ensure)
- [x] T007 [US1] `app/shopping-list/ShoppingClient.tsx` treats index as meta; still loads detail by id; do not wait on a cookbook GET

**Checkpoint**: Dropdown meta + one detail; browse GET does not migrate schema

---

## Phase 4: User Story 2 - Recipe pills still link without the cookbook (P2)

**Goal**: Pills use stored contribution URLs plus detail `recipe_sources`. No cookbook GET on mount.

**Independent Test**: Open a list with original URLs; pills link; no `/api/recipes` on that visit.

- [x] T008 [US2] Detail `getShoppingListById` in `lib/db.ts` attaches `recipe_sources` from a card-field lookup of `recipe_ids`
- [x] T009 [US2] `ShoppingClient.tsx` builds `recipeSources` from items + `recipe_sources`; remove the mount `GET /api/recipes`

**Checkpoint**: Pills link without a cookbook download

---

## Phase 5: User Story 3 - Generating a list still has every ingredient (P2)

**Goal**: One `getMealPlansForWeeks` with `includeMethod: true`.

**Independent Test**: Generate from two weeks; ingredient lines present.

- [x] T010 [US3] `POST` in `app/api/shopping-lists/route.ts` uses `getMealPlansForWeeks(week_starts, user.id, { includeMethod: true })` instead of a per-week loop

**Checkpoint**: Generate is one full-method meals query

---

## Phase 6: User Story 4 - Owner lookups stay cheap (P3)

- [x] T011 [US4] Add `CREATE INDEX IF NOT EXISTS idx_shopping_lists_owner_generated ON shopping_lists (owner_id, generated_at DESC)` in `ensureAccountsSchema` (and `setupDatabase` after owner exists) in `lib/db.ts`

**Checkpoint**: List filters have a matching index; shopping GET still does not create it

---

## Phase 7: Polish

- [x] T012 Confirm empty household skips detail GET; live check/uncheck unchanged; run `npm test` and gitleaks

---

## Dependencies & Execution Order

- Setup → Foundational → US1 (MVP) → US2 / US3 → US4 → Polish
- T002 and T003 before T004. T004 before T005–T010. T005 before T006.

## Implementation Strategy

1. Tests for `lib/shoppingList.ts` and generate `source_url`, then implementation
2. Meta GET without schema ensure + client no cookbook
3. Detail `recipe_sources`; one weeks query; index
4. `npm test` + secret scan
