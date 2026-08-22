# Data model: Hold-drag session

No new persisted tables. Session state is client-only.

## Hold session

| Field | Meaning |
|-------|---------|
| `mealId` | Saved meal being moved |
| `originIso` | Calendar date the meal started on |
| `startX`, `startY` | Pointer down |
| `x`, `y` | Current pointer |
| `armed` | Hold finished; rail visible; capture on |
| `target` | Week-day, rail-day, or none |

## Rail day

| Field | Meaning |
|-------|---------|
| `iso` | `YYYY-MM-DD` |
| `occupied` | At least one dinner on that date |
| `titles` | Preview names of those dinners |

## Validation

- `shouldAllowDrag(mealId)` is false for empty or `tmp-*` ids.
- Drop onto `originIso` is a no-op (no write).
- Release with `target === null` is a cancel (no write).
