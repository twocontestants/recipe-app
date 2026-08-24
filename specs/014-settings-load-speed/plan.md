# Implementation Plan: Faster settings load

**Branch**: `cursor/settings-page-speed-0508` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-settings-load-speed/spec.md`

## Summary

Make opening Settings a session plus one preferences read plus an ingredients-only dictionary: no kitchen schema work on browse, no method steps/ratings/notes on the dictionary GET, account and week-start not gated on that dictionary, retag still on full recipes. No new libraries or indexes.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 App Router

**Primary Dependencies**: Existing stack (`next`, `pg`, `react`). No new packages.

**Storage**: Postgres `recipes` / `ingredient_categories` / `app_settings` (same tables). No new tables or indexes.

**Testing**: Vitest — helpers for owned-ingredients SQL, dictionary aggregation, preferences key map. Constitution III: tests before behavior changes.

**Target Platform**: Household web app. Custom `server.js` + Socket.IO (unchanged).

**Project Type**: Web application

**Performance Goals**: Typical Settings open shows account/week-start without waiting on method bodies; dictionary fills from owned `ingredients` JSON only.

**Constraints**: Constitution V — no new libraries. VI — no secrets. Schema migration stays on `/api/setup` and writes, not on Settings/preferences GET.

**Scale/Scope**: Settings client (already mostly unblocked), preferences GET, ingredient-categories GET, `lib/db.ts` reads. Retag keeps `listRecipes`.

## Constitution Check

- I Household-first: account and week-start stay tappable while the dictionary fills.
- II Extract what you test: ingredients SELECT, dictionary aggregation, preferences map in `lib/`.
- III Test-first: failing tests for those rules before wiring the API.
- V Simplicity: slimmer SELECT + one settings query. No cache service.
- VI Secrets: unchanged.
- VII Kitchen dates: week-start remains a day name setting, not a timestamp.

Post-design: still passes. No complexity table.

## Project Structure

### Documentation (this feature)

```text
specs/014-settings-load-speed/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── settings-load.md
└── tasks.md
```

### Source Code (repository root)

```text
lib/settingsLoad.ts            # ingredients SQL, dictionary aggregation, pref keys
lib/settingsLoad.test.ts
lib/db.ts                      # owned ingredients read; getAppSettings; drop ensure on GET
app/api/ingredient-categories/route.ts
app/api/preferences/route.ts
app/settings/SettingsClient.tsx  # keep account/prefs outside dictionary spinner
app/api/recipes/retag/route.ts   # still listRecipes
```

**Structure Decision**: Stay in the existing Next.js app. Extract dictionary rules to `lib/`. Keep full `listRecipes` for retag.

## Complexity Tracking

No constitution violations.
