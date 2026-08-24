# Quickstart: Faster shopping list load

## Prerequisites

- Postgres (`POSTGRES_URL`) with kitchen tables already created (`/api/setup` once).
- `npm install`

## Checks

1. Open Shopping signed in with more than one saved list. Network: `GET /api/shopping-lists` returns meta only (no `items` / `checked_state`). Then one `GET /api/shopping-lists?id=` for the open list. No `GET /api/recipes` on that visit.
2. Recipe pills on a list with original URLs are links. An older list still links via `recipe_sources` or stored contribution URLs, not a full cookbook download.
3. Generate a list covering two weeks: ingredient lines from both weeks are present.
4. Browsing Shopping does not run schema ensure (no table-creation/column-migration on GET).

## Tests

```bash
npm test
```

Expect coverage of meta SELECT columns, contribution `source_url`, and title→URL map merge (no live Postgres).
