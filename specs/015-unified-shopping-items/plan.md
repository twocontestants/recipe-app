# Implementation Plan: Unified shopping list items

**Branch**: `cursor/unified-shopping-items-9780` | **Date**: 2026-08-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-unified-shopping-items/spec.md`

## Summary

Store every shopping line — recipe-derived or hand-added — in the existing `items` JSONB array. Persist a yes/no `checked` flag on that item (and on a detached contribution when that wording is its own row). Stop using `custom_items` and `checked_state` as the source of truth. Drop stored `checkedBy` / `checkedAt`. Fold older lists on first detail read, same as the existing id migration.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`, `socket.io`). No new packages.

**Storage**: Postgres `shopping_lists.items` JSONB. `custom_items` and `checked_state` columns remain for older rows but are emptied on migrate write-back and no longer written by new ops.

**Testing**: Vitest — migrate fold, check SQL, ops shape, generate default `checked: false`. Constitution III: tests before behavior changes.

**Target Platform**: Household web app. Socket.IO stays a pure relay for live ticks.

**Project Type**: Web application

**Performance Goals**: Detail GET still one row. Index GET still meta-only. No extra round-trips.

**Constraints**: Constitution V — no new libraries. VI — no secrets. Schema work stays off shopping GET. Browse does not CREATE/ALTER. Fold happens in the existing on-read migrate + best-effort write-back.

**Scale/Scope**: `lib/shopping.ts` item shape, `lib/shoppingList.ts` migrate/adopt, `lib/shoppingOps.ts` + `lib/db.ts` ops SQL, `ShoppingClient.tsx`.

## Constitution Check

- I Household-first: tick, add, and aisle controls stay as they are; only the stored shape changes.
- II Extract what you test: fold, check SQL, and item helpers live in `lib/`.
- III Test-first: failing tests for unified items / boolean ticks before wiring API and client.
- V Simplicity: one JSON array, one boolean. No new table or library.
- VI Secrets: unchanged.
- VII Kitchen dates: unchanged.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/015-unified-shopping-items/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── shopping-items.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/shopping.ts                 # ShoppingItem.checked + custom
lib/shoppingList.ts             # fold custom/ticks onto items; check SQL
lib/shoppingList.test.ts
lib/shoppingOps.ts              # check value is boolean only
lib/shoppingOps.test.ts
lib/db.ts                       # ops write items[], not custom_items / checked_state
app/shopping-list/ShoppingClient.tsx
```

**Structure Decision**: Stay in the existing Next.js app. Extend the current on-read migrate. Do not drop leftover columns in this change.

## Complexity Tracking

No constitution violations.
