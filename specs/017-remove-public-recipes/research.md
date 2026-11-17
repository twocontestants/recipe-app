# Research: Remove public recipes

## Decision 1: Force private; keep column for now

**Decision**: On schema ensure, set all `visibility = 'private'` and stop writing/reading `public`. Keep the column (always private) to avoid a destructive drop in this change.

**Rationale**: Spec requires formerly public recipes to become private. Dropping the column is optional cleanup; forcing private is enough for product behavior.

**Alternatives considered**: Drop `visibility` column immediately — more migration risk, little user value now.

## Decision 2: Guest list requires auth

**Decision**: `GET /api/recipes` without a session returns 401. Recipes UI redirects guests to login.

**Rationale**: Spec FR-003 — no guest browse. Empty public list would look broken.

**Alternatives considered**: Return `[]` for guests — weaker than requiring sign-in and still implies a guest library endpoint.

## Decision 3: Remove publisher role

**Decision**: Roles become `cook` | `moderator`. Migrate `publisher` → `cook`. Remove `canPublishOwn` / publish APIs. Settings role select offers cook/moderator only.

**Rationale**: Publisher existed only for the public library.

**Alternatives considered**: Keep publisher as unused enum — leaves dead UX in Settings.

## Decision 4: Starter recipes deferred

**Decision**: Document only; no seed/copy of starter recipes in this feature.

**Rationale**: User said starter recipes are future work.

## Decision 5: Planner picker

**Decision**: Fetch `/api/recipes` (owned only); remove `?includePublic=1` and owned-only filter UI if it existed solely for hiding public items.

**Rationale**: FR-002.
