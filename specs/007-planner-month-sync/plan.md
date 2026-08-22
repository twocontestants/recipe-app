# Implementation Plan: Month prefetch and live planner sync

**Branch**: `cursor/planner-month-sync-4c97` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-planner-month-sync/spec.md`

## Summary

Replace week-by-week meal cache with a **calendar-month** download (`GET /api/planner?from=&to=`). The planner still renders one display week. Reuse the existing Socket.IO relay: `join-planner` / `planner-changed` (exclude sender). Remote clients drop the month copy and reload. Extract month-window math into `lib/plannerMonth.ts`.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Next.js 14 + `server.js`

**Primary Dependencies**: Existing `socket.io` / `socket.io-client` (shopping list); `pg` meal_plans

**Storage**: Unchanged `meal_plans.week_start` keys. New read path: all storage weeks overlapping `[from, to]`.

**Testing**: Vitest for month key/range, storage weeks for a month, missing-month helper

**Target Platform**: Same as shopping list (Render-hosted socket via `NEXT_PUBLIC_SOCKET_URL`)

**Project Type**: Web application with custom HTTP + Socket.IO server

**Constraints**: Constitution — extract testable math; no new libraries. Do not change `formatWeekStart`. Sender excluded from own broadcast (`socket.to`).

**Scale/Scope**: One household planner room; Planner + Recipes sheet + Generate List can share the range GET.

## Constitution Check

- Household-first: week UI unchanged; month load is silent.
- Extract what you test: `plannerMonth.ts`.
- Test-first: month range and storage-week overlap tests before API/clients.
- Overlay honesty: N/A.
- Simplicity: one extra socket room; one range query. No new realtime product.

Post-design: no constitution violations.

## Project Structure

```text
specs/007-planner-month-sync/
lib/plannerMonth.ts
lib/plannerMonth.test.ts
lib/db.ts
app/api/planner/route.ts
server.js
components/usePlannerLive.ts
app/planner/PlannerClient.tsx
app/recipes/RecipesClient.tsx
```

Remove week-grain helpers from the hot path (`plannerWeekCache` retired or unused).

## Phase 0 — Research

See [research.md](./research.md).

## Phase 1 — Design

- [data-model.md](./data-model.md)
- [contracts/planner-month-sync.md](./contracts/planner-month-sync.md)
- [quickstart.md](./quickstart.md)
