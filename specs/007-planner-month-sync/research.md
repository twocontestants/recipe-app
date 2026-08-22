# Research: Month prefetch and live planner sync

## Week cache vs month load

- **Decision**: One GET for local `from`/`to` covering the calendar month. Client keeps meals in a map; a `Set` of loaded month keys. Display week filters that map.
- **Rationale**: User rejected week-chunked cache. A month is ~4–6 storage weeks and one query.
- **Alternatives considered**: Keep fetching weeks and merge (still week-grained). Load the whole year (heavier, not asked).

## Live updates

- **Decision**: Same Socket.IO server as shopping lists. Room `planner`. Client emits `planner-changed` after a successful HTTP write. Server `socket.to('planner').emit('planner-changed')`. Receivers reload the current month from HTTP.
- **Rationale**: Already production-proven; DB stays source of truth; `socket.to` skips the sender.
- **Alternatives considered**: New SSE endpoint (duplicate channel). Server-side emit from the Next route (Next on Vercel cannot reach the Render `io` instance; shopping list already emits from the client). Polling (user asked for a socket).

## Month that spans storage weeks

- **Decision**: Query an inclusive padded `week_start` window (`plannerQueryWindow`). Optionally union client-passed `weeks=` from `storageWeeksForDateRange` run in the browser. Keep `?weekStart=` for the visible week.
- **Rationale**: `storageWeeksForDateRange` on a UTC host asks for Monday keys (`2026-08-17`) while Australian rows are stored as the previous Sunday (`2026-08-16`). That empty month was cached and a first-paint focus reload locked the planner blank. Existing `week_start` rows stay as-is.
- **Alternatives considered**: Change `formatWeekStart` (needs a data migration). Only client `weeks=` (still fails if a client omits them). Exact Monday `ANY(...)` on the server (the bug).
