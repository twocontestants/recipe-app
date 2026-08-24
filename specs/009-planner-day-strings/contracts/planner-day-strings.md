# Contract: Kitchen day strings

## `toDayIso(value) → YYYY-MM-DD`

| Input | Output |
|-------|--------|
| `'2026-08-24'` | `'2026-08-24'` |
| `'2026-08-24T00:00:00.000Z'` | `'2026-08-24'` |
| `Date.UTC(2026, 7, 24)` (legacy Date) | `'2026-08-24'` |

Identity for an already-correct day string. Does not invent a new calendar day.

## Driver

Postgres `DATE` (OID `types.builtins.DATE`) MUST parse as the raw text `YYYY-MM-DD`. MUST NOT parse as a JS `Date`.

## HTTP

`GET /api/planner` meal objects MUST include `"planned_on": "2026-08-24"` (calendar day), never `"Mon Aug 24"`.
`week_start` MUST be `YYYY-MM-DD`, not a timestamp.

## Client

`mealOnDate(meal, iso)` is true iff the kitchen day string equals `iso`.
