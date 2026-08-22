# Contract: Month prefetch and live planner sync

## `lib/plannerMonth.ts`

- `monthKeyOf(iso)` → `YYYY-MM`
- `monthRange(key)` → `{ from, to }` local first/last day
- `monthsForDisplayWeek(weekStartIso)` → month keys touched by those seven days
- `storageWeeksForDateRange(from, to)` → unique storage week keys, first-seen order
- `missingMonths(needed, loaded)` → keys not in `loaded`

Required: August 2026 → from `2026-08-01` to `2026-08-31`. A Monday-start week that includes 31 Aug and 1 Sep needs both `2026-08` and `2026-09`.

## `GET /api/planner?from=&to=`

Returns the same meal objects as `?weekStart=`, for every storage week overlapping the inclusive local range.

`GET /api/planner?weekStart=` unchanged.

## Socket (`server.js`)

| Client → server | Server → others |
|-----------------|-----------------|
| `join-planner` | join room `planner` |
| `planner-changed` | `socket.to('planner').emit('planner-changed')` |

No DB access on the socket (same as shopping list).

## Clients

Planner and Recipes: `usePlannerLive`. After successful add/move/delete, `broadcastPlannerChanged()`. On remote event, reload loaded months from GET `from`/`to`.
