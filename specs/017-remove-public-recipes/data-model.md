# Data Model: Remove public recipes

## Recipe

| Field | Change |
|-------|--------|
| visibility | Always `private`. One-time migration updates existing `public` → `private`. |
| owner_id | Unchanged; sole access key for view/edit/list/plan |

No public index needed for product queries; `idx_recipes_owner_created` remains the list path.

## User

| Field | Change |
|-------|--------|
| role | Allowed values: `cook`, `moderator`. Existing `publisher` rows → `cook`. CHECK constraint updated. |

## Removed concepts

- Public library / guest catalog
- Publish / unpublish actions
- `includePublic` / `ownedPlusPublic` list modes
- Publisher role

## Future (out of scope)

- Starter recipe templates copied into a new cook’s kitchen on signup
