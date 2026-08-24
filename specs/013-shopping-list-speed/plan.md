# Implementation Plan: Faster shopping list load

**Branch**: `cursor/shopping-list-speed-0508` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-shopping-list-speed/spec.md`

## Summary

Make opening Shopping a light meta index plus one detail read: no kitchen schema work on browse, no item JSONB on the dropdown payload, no cookbook GET for recipe pills, generate via one full-method meals query for all selected weeks, and an owner+generated-at index. No new libraries.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). No new packages.

**Storage**: Postgres `shopping_lists` (same table). New index only: `(owner_id, generated_at DESC)`. No new tables. Contribution `source_url` is JSON inside existing `items`.

**Testing**: Vitest — helpers for meta SELECT, source maps, and generate copying `source_url`. Constitution III: tests before behavior changes.

**Target Platform**: Household web app. Custom `server.js` + Socket.IO (unchanged).

**Project Type**: Web application

**Performance Goals**: Typical Shopping open draws the newest list after a meta GET plus one detail GET that does not wait on the cookbook or every other list’s items.

**Constraints**: Constitution V — no new libraries. VI — no secrets. VII — kitchen dates stay `YYYY-MM-DD` on generate week keys. Schema migration stays on `/api/setup` and writes, not on shopping GET.

**Scale/Scope**: Shopping client, shopping GET/POST, `lib/shopping.ts` contribution shape, `lib/db.ts` list reads and index.

## Constitution Check

- I Household-first: dropdown and list stay tappable; first paint is meta + one list body.
- II Extract what you test: meta column list / SELECT, source maps in `lib/`.
- III Test-first: failing tests for those rules before wiring the client/API.
- V Simplicity: slimmer SELECT + fewer fetches. No cache service.
- VI Secrets: unchanged.
- VII Kitchen dates: generate still keys weeks as `YYYY-MM-DD`.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/013-shopping-list-speed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── shopping-list.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/shoppingList.ts            # meta SELECT, meta type, source maps
lib/shoppingList.test.ts
lib/shopping.ts                # contribution source_url at generate
lib/shopping.test.ts
lib/db.ts                      # meta index GET; recipe_sources on detail; index
app/api/shopping-lists/route.ts # no schema on GET; one weeks query on POST
app/shopping-list/ShoppingClient.tsx # no cookbook GET; map from detail
```

**Structure Decision**: Stay in the existing Next.js app. Extract load rules to `lib/`. Keep full meal join for shopping generation via `getMealPlansForWeeks`.

## Complexity Tracking

No constitution violations.
