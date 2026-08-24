# Research: Per-user accounts

## How to persist sign-in across restarts

- **Decision**: HTTP-only cookie holding a random session id. Session row in Postgres (`sessions`) with expiry. Lookup on each request. Delete on logout or expiry.
- **Rationale**: Spec forbids process memory. Postgres is already the source of truth. Survives `server.js` restart and new Node processes on Vercel/Render.
- **Alternatives considered**: In-memory `Map` (lost on restart). JWT-only with no server record (cannot revoke). Redis (new service, constitution V). NextAuth (new library).

## How to store passwords

- **Decision**: Node `crypto.scrypt` with a per-user salt. Compare in constant-ish time. Never log passwords.
- **Rationale**: No new dependency. Adequate for a household app.
- **Alternatives considered**: bcrypt/argon2 libraries (extra dep). Plain text (unacceptable).

## Kitchen owner for leftover rows

- **Decision**: Setup never creates an account. If users already exist, leftover unowned kitchen rows are attached to the oldest user. If nobody has registered yet, owner columns stay nullable until a real account exists. Password changes happen in Settings.
- **Rationale**: The first kitchen already has a normal account. Seed/bootstrap creation was leftover special-case code.
- **Alternatives considered**: Env-created moderator on empty users table (rejected). Hardcoded seed login (rejected).

## Sign-in must not migrate the kitchen

- **Decision**: Login, register, and session lookup only ensure `users` + `sessions`. Kitchen owner columns, ratings tables, and composite primary-key rewrites run from `/api/setup` and from kitchen APIs, not from `/api/auth/login`.
- **Rationale**: `ALTER TABLE` / drop-and-recreate primary keys on every sign-in can lock and hang, which looks like a stuck “Please wait…” button with no error.
- **Alternatives considered**: Keep calling `setupDatabase()` from login (hung). A separate migrator process (extra ops).

## Session secret

- **Decision**: Cookie value is a high-entropy random id stored hashed or as the id in Postgres. Optional `SESSION_SECRET` only if we HMAC the cookie; simplest is an unguessable id in the cookie and the same id (or hash of it) in the table. Prefer storing the raw random id in Postgres and in the cookie — id space is 32 bytes hex. No secret required beyond the id entropy. Still document `SESSION_SECRET` unused unless we add signing later.
- **Rationale**: Session ids do not need a second secret if they are long random values.
- **Alternatives considered**: Signed cookies (needs secret in env).

## Who can publish

- **Decision**: Three roles: `cook` (default signup), `publisher`, `moderator`. Publish/unpublish own recipes requires `publisher` or `moderator`. Moderators grant/revoke those roles and unpublish anyone. Cannot peek private kitchens.
- **Rationale**: Matches “not everyone can add/edit publicly” plus an explicit moderator role.
- **Alternatives considered**: Publish as a boolean flag on cook (same power, less obvious in UI). Everyone publishes (rejected by the cook).

## Public recipe on the planner

- **Decision**: `meal_plans.recipe_id` points at the live recipe. Edit UI is hidden unless `recipe.owner_id === current user`. Duplicate creates a new private recipe owned by the current user; planner is unchanged unless they add the duplicate.
- **Rationale**: Explicit cook choice. Unpublish leaves existing plan rows; picker hides unpublished recipes for new adds.
- **Alternatives considered**: Silent copy on plan (rejected). Fork on first edit (less clear than an explicit duplicate).

## Email password reset

- **Decision**: Email reset stays out of this slice (no mailer). Signed-in cooks change their password from Settings (current password required). Setup does not overwrite an existing hash from env.
- **Rationale**: Spec assumed email reset; shipping it without a mailer would be fake. A Settings form is enough for a household app.
- **Alternatives considered**: Console-print reset tokens (not household-safe). Moderator-forced reset (not needed if each cook can change their own). Reset a named account’s hash on setup (blocked Settings changes).

## Socket.IO planner rooms

- **Decision**: Join `planner:<userId>` instead of a global `planner` room. Shopping lists already join by list id; lists become per-user so rooms stay isolated.
- **Rationale**: Live sync must not leak another cook’s plan.
- **Alternatives considered**: Keep global room and filter client-side (leaks).

## Guest recipe GET

- **Decision**: `GET /api/recipes` without a session returns only `visibility = public`. With a session, default is owner’s recipes; `?includePublic=1` adds others’ public recipes. Planner picker uses `includePublic=1` with `?ownedOnly=1` to filter.
- **Rationale**: Matches library toggle vs planner picker defaults (picker includes public; library toggle defaults off).
