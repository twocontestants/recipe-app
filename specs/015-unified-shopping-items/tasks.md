# Tasks: Unified shopping list items

**Input**: Design documents from `/specs/015-unified-shopping-items/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution III — write failing tests before the matching production change.

**Organization**: Tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)

## Path Conventions

Repository root: `lib/`, `app/shopping-list/`, `app/api/shopping-lists/`

---

## Phase 1: Setup

**Purpose**: Feature artifacts are in place; no new project init.

- [x] T001 Confirm ignore files already cover Node artifacts in `.gitignore`

---

## Phase 2: Foundational

**Purpose**: Shared item shape and leftover-column rules that every story uses

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add `checked: boolean` and optional `custom?: boolean` to `ShoppingItem` in `lib/shopping.ts`
- [x] T003 [P] Generate new items with `checked: false` in `lib/shopping.ts` and assert that in `lib/shopping.test.ts`
- [x] T004 Keep meta SELECT omitting item bodies, including leftover `custom_items` / `checked_state`, in `lib/shoppingList.ts` and `lib/shoppingList.test.ts`

**Checkpoint**: Item type can carry a tick and a custom flag; dropdown still slim

---

## Phase 3: User Story 1 - A tick belongs to the line itself (Priority: P1) 🎯 MVP

**Goal**: Persist yes/no on the item; drop who/when; live ticks still work

**Independent Test**: Tick two lines, reload; they stay ticked; no who/when stored

### Tests for User Story 1

- [x] T005 [P] [US1] Write failing tests for boolean tick fold, check SQL, and legacy who/when drop in `lib/shoppingList.test.ts`
- [x] T006 [P] [US1] Write failing tests for `{ t: 'check', checked: boolean }` (and legacy `value`) in `lib/shoppingOps.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Replace `checked_state` helpers with item-boolean adopt/fold in `lib/shoppingList.ts`
- [x] T008 [US1] Change `ShoppingOp` check to `{ key, checked: boolean }` and keep legacy `value` in `lib/shoppingOps.ts`
- [x] T009 [US1] Apply check / clearChecked against `items` JSONB in `lib/db.ts`
- [x] T010 [US1] Drive `ShoppingClient.tsx` ticks from `item.checked` (local boolean map ok); persist without who/when

**Checkpoint**: Recipe-derived ticks persist as `item.checked`

---

## Phase 4: User Story 2 - Hand-added lines are ordinary list items (Priority: P2)

**Goal**: Custom lines live in `items` with `custom: true`

**Independent Test**: Add, tick, rename, move, delete a typed line; reload keeps it

### Tests for User Story 2

- [x] T011 [P] [US2] Write failing tests that add/update/remove custom ops target `items` in `lib/shoppingList.test.ts`

### Implementation for User Story 2

- [x] T012 [US2] Point addCustom / updateCustom / removeCustom SQL at `items` in `lib/db.ts`
- [x] T013 [US2] Add typed lines into `serverItems` as `custom: true` items in `app/shopping-list/ShoppingClient.tsx`

**Checkpoint**: Extras and recipe lines share one array

---

## Phase 5: User Story 3 - Older lists still open with their ticks and extras (Priority: P2)

**Goal**: On-read fold of leftover `custom_items` + `checked_state`

**Independent Test**: Open a split-shape fixture; ticks and extras appear and survive a second read

### Tests for User Story 3

- [x] T014 [US3] Write failing migrate tests for leftover extras, name-keyed ticks, and detached `id#index` ticks in `lib/shoppingList.test.ts`

### Implementation for User Story 3

- [x] T015 [US3] Extend `migrateShoppingListShape` to fold extras and ticks, empty leftover columns, in `lib/shoppingList.ts`
- [x] T016 [US3] Write-back folded `items` (and empty leftovers) from `getShoppingListById` in `lib/db.ts`
- [x] T017 [US3] Accept leftover `custom_items` / `checked_state` on PUT by folding in `lib/db.ts` / `app/api/shopping-lists/route.ts` if still used

**Checkpoint**: Old rows upgrade on first detail read

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 [P] Update `ShoppingList` types and `rowToShoppingList` in `lib/db.ts` so detail prefers unified items
- [x] T019 Run `npm test` and fix regressions in `lib/shoppingList.test.ts`, `lib/shoppingOps.test.ts`, `lib/shopping.test.ts`
- [x] T020 Walk the Shopping page: tick, add extra, reload; dropdown stays meta-only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: After setup — blocks stories
- **US1 (Phase 3)**: After foundational
- **US2 (Phase 4)**: After US1 (same `items` array and check SQL)
- **US3 (Phase 5)**: After US1+US2 (fold writes the unified shape)
- **Polish**: After stories

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2
- **User Story 2 (P2)**: After US1 check/item SQL
- **User Story 3 (P2)**: After US1+US2 so fold output matches new ops

### Parallel Opportunities

- T003 / T004 after T002
- T005 / T006 together
- T011 after US1 tests exist

---

## Parallel Example: User Story 1

```bash
# Tests first:
# T005 lib/shoppingList.test.ts
# T006 lib/shoppingOps.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1–2
2. Phase 3 (boolean ticks on items)
3. Validate tick + reload

### Incremental Delivery

1. Ticks on items
2. Custom lines in the same array
3. Fold older rows
4. Polish + `npm test`

## Notes

- Do not drop `custom_items` / `checked_state` columns in this feature
- Live socket stays a relay; do not persist shopper name
- item_overrides / aisle chrome unchanged
