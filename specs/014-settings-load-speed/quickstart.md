# Quickstart: Faster settings load

## Prerequisites

- Postgres (`POSTGRES_URL`) with kitchen tables already created (`/api/setup` once).
- `npm install`

## Checks

1. Open Settings signed in. Account (password / sign out) is usable before the ingredient list finishes. Network: one `GET /api/preferences`; one `GET /api/ingredient-categories`. Dictionary payload has ingredient names and does not include recipe steps.
2. Week-start and aisle-save match saved values after that one preferences GET.
3. Change an aisle; generate a shopping list; the new aisle is used.
4. As a Cook, no `GET /api/auth/users`. As a Moderator, the role list still loads.
5. Browsing Settings does not run schema ensure.

## Tests

```bash
npm test
```

Expect coverage of ingredients-only SELECT, dictionary aggregation (counts, leftover overrides, no steps), and preferences key map (no live Postgres).
