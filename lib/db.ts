import { Pool, types } from 'pg';
import { autoTag } from './autotag';
import { SESSION_MAX_AGE_SEC } from './auth';
import { primaryKeyMatches } from './primaryKey';
import { parseDayOfWeek } from './plannerDays';
import { coordsFromPlannedOn, inferPlannedOn, toDayIso, weekSpanForStoredKey } from './plannerDate';
import { parseRole, type AuthUser, type Role } from './roles';
import { checkOpIsOn, type ShoppingOp } from './shoppingOps';
import {
  customItemPayload,
  migrateShoppingListShape,
  recipeSourceMapFromRecipes,
  shoppingListAddItemSql,
  shoppingListClearCheckedSql,
  shoppingListContributionCheckSql,
  shoppingListItemCheckSql,
  shoppingListMetaSelectSql,
  shoppingListRemoveItemSql,
  shoppingListUpdateItemSql,
  splitCheckKey,
  toShoppingListMeta,
  type ShoppingListMeta,
} from './shoppingList';
import { ownedIngredientsSelectSql, preferenceSettingsSelectSql } from './settingsLoad';
import { parseVisibility, type Visibility } from './visibility';

// Postgres DATE arrives as YYYY-MM-DD text. Keep it as that string — node-pg
// otherwise wraps it in a JS Date, which stringifies as "Mon Aug 24".
types.setTypeParser(types.builtins.DATE, (value: string) => value);

// Vercel Postgres gives us POSTGRES_URL as the pooled connection string.
// We use the raw `pg` driver to avoid @vercel/postgres wrapper confusion.
let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL is not set');
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  source_url?: string;
  image_url?: string;
  servings: number;
  prep_time?: number;
  cook_time?: number;
  /** Omitted on list cards; always arrays on detail and write responses. */
  ingredients?: Ingredient[];
  steps?: string[];
  tags: string[];
  primary_protein?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  visibility: Visibility;
  owner_display_name?: string;
  can_edit?: boolean;
  can_publish?: boolean;
  my_rating?: number | null;
  my_note?: string | null;
}

export interface MealPlan {
  id: string;
  planned_on: string;
  week_start: string;
  recipe_id: string;
  day_of_week: number;
  meal_type: string;
  servings: number;
  recipe?: Recipe;
}

export async function setupDatabase() {
  await pool().query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      source_url TEXT,
      image_url TEXT,
      servings INTEGER DEFAULT 4,
      prep_time INTEGER,
      cook_time INTEGER,
      ingredients JSONB NOT NULL DEFAULT '[]',
      steps JSONB NOT NULL DEFAULT '[]',
      tags TEXT[] DEFAULT '{}',
      primary_protein TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool().query(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL,
      recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      meal_type TEXT DEFAULT 'dinner',
      servings INTEGER DEFAULT 4,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON meal_plans(week_start)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC)`);
  await pool().query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS primary_protein TEXT`);
  // Named shopping lists. Ticks and hand-added lines live on items JSON.
  // leftover custom_items / checked_state columns stay for older rows.
  await pool().query(`
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      week_starts TEXT[] NOT NULL DEFAULT '{}',
      recipe_ids TEXT[] NOT NULL DEFAULT '{}',
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      item_overrides   JSONB NOT NULL DEFAULT '{}',
      custom_items     JSONB NOT NULL DEFAULT '[]',
      category_labels  JSONB NOT NULL DEFAULT '{}',
      category_order   JSONB NOT NULL DEFAULT '[]',
      item_order       JSONB NOT NULL DEFAULT '{}',
      checked_state    JSONB NOT NULL DEFAULT '{}',
      items            JSONB NOT NULL DEFAULT '[]'
    )
  `);
  await pool().query(`ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'`);

  await pool().query(`
    CREATE TABLE IF NOT EXISTS planner_notes (
      week_start DATE NOT NULL,
      day_of_week INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (week_start, day_of_week)
    )
  `);

  // User-editable dictionary mapping a normalised ingredient name to a category.
  // An entry here overrides the built-in rule-based categorisation at list
  // generation time. Keyed by the normalised name (the same value used as the
  // merge key), so one row covers every surface form that normalises to it.
  await ensureIngredientCategoriesTable();
  await ensureAppSettingsTable();
  await ensurePlannedOnColumns();
  await ensureAccountsSchema();
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_recipes_owner_created ON recipes(owner_id, created_at DESC)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_recipes_visibility_created ON recipes(visibility, created_at DESC)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_shopping_lists_owner_generated ON shopping_lists (owner_id, generated_at DESC)`);
}

let _appSettingsReady = false;
async function ensureAppSettingsTable(): Promise<void> {
  await pool().query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  _appSettingsReady = true;
}

export async function getAppSettings(ownerId: string, keys: readonly string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const result = await pool().query(preferenceSettingsSelectSql(), [ownerId, keys]);
  const map: Record<string, string> = {};
  for (const row of result.rows) map[row.key as string] = row.value as string;
  return map;
}

export async function getAppSetting(ownerId: string, key: string): Promise<string | null> {
  const map = await getAppSettings(ownerId, [key]);
  return map[key] ?? null;
}

export async function setAppSetting(ownerId: string, key: string, value: string): Promise<void> {
  if (!_appSettingsReady) await ensureAppSettingsTable();
  await ensureAccountsSchema();
  await pool().query(
    `INSERT INTO app_settings (owner_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (owner_id, key) DO UPDATE SET value = $3`,
    [ownerId, key, value]
  );
}

let _ingredientCategoriesReady = false;
async function ensureIngredientCategoriesTable(): Promise<void> {
  await pool().query(`
    CREATE TABLE IF NOT EXISTS ingredient_categories (
      name       TEXT PRIMARY KEY,
      category   TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  _ingredientCategoriesReady = true;
}

// Returns the dictionary as a plain { normalisedName: category } map.
export async function getCategoryDictionary(ownerId: string): Promise<Record<string, string>> {
  const result = await pool().query(
    'SELECT name, category FROM ingredient_categories WHERE owner_id = $1',
    [ownerId],
  );
  const map: Record<string, string> = {};
  for (const row of result.rows) map[row.name] = row.category;
  return map;
}

/** Ingredient JSON for Settings. No steps, ratings, notes, or schema ensure. */
export async function listOwnedIngredientLines(ownerId: string): Promise<Array<{ id: string; ingredients: Ingredient[] }>> {
  const result = await pool().query(
    `${ownedIngredientsSelectSql()} WHERE r.owner_id = $1`,
    [ownerId],
  );
  return result.rows.map(row => ({
    id: row.id as string,
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as Ingredient[]) : [],
  }));
}

export async function setCategoryDictionaryEntry(ownerId: string, name: string, category: string): Promise<void> {
  if (!_ingredientCategoriesReady) await ensureIngredientCategoriesTable();
  await ensureAccountsSchema();
  await pool().query(
    `INSERT INTO ingredient_categories (owner_id, name, category)
     VALUES ($1, $2, $3)
     ON CONFLICT (owner_id, name) DO UPDATE SET category = $3, updated_at = NOW()`,
    [ownerId, name, category]
  );
}

export async function deleteCategoryDictionaryEntry(ownerId: string, name: string): Promise<void> {
  if (!_ingredientCategoriesReady) await ensureIngredientCategoriesTable();
  await ensureAccountsSchema();
  await pool().query(
    'DELETE FROM ingredient_categories WHERE owner_id = $1 AND name = $2',
    [ownerId, name],
  );
}

let _authTablesReady = false;
let _accountsReady = false;

async function pkColumns(table: string): Promise<string[]> {
  const result = await pool().query(
    `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`,
    [table],
  );
  return result.rows.map(r => r.attname as string);
}

/** Users + sessions only. Sign-in must not wait on kitchen ALTER/PK migrations. */
export async function ensureAuthTables(): Promise<void> {
  if (_authTablesReady) return;
  await pool().query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      login_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cook'
        CHECK (role IN ('cook', 'publisher', 'moderator')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool().query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
  _authTablesReady = true;
}

async function firstUser(): Promise<AuthUser | null> {
  const result = await pool().query(
    `SELECT id, login_name, display_name, role FROM users ORDER BY created_at ASC LIMIT 1`,
  );
  if (!result.rows.length) return null;
  return mapAuthUser(result.rows[0]);
}

export async function ensureAccountsSchema(): Promise<void> {
  if (_accountsReady) return;

  await ensureAuthTables();
  const owner = await firstUser();

  await addOwnerId('recipes', owner?.id ?? null);
  await pool().query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'`);
  await pool().query(`
    CREATE TABLE IF NOT EXISTS schema_flags (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  // Historical one-time flag name; do not rename or the public-library backfill would run again.
  const flagged = await pool().query(`SELECT value FROM schema_flags WHERE key = 'jessica_recipes_public_backfill'`);
  if (owner && !flagged.rows.length) {
    await pool().query(`UPDATE recipes SET visibility = 'public' WHERE owner_id = $1`, [owner.id]);
    await pool().query(
      `INSERT INTO schema_flags (key, value) VALUES ('jessica_recipes_public_backfill', 'done')`,
    );
  }

  await addOwnerId('meal_plans', owner?.id ?? null);
  await addOwnerId('planner_notes', owner?.id ?? null);
  await addOwnerId('shopping_lists', owner?.id ?? null);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_shopping_lists_owner_generated ON shopping_lists (owner_id, generated_at DESC)`);
  await addOwnerId('app_settings', owner?.id ?? null);
  await addOwnerId('ingredient_categories', owner?.id ?? null);

  await migrateCompositePk('app_settings', ['owner_id', 'key']);
  await migrateCompositePk('ingredient_categories', ['owner_id', 'name']);
  await migrateCompositePk('planner_notes', ['owner_id', 'week_start', 'day_of_week']);

  await pool().query(`DROP INDEX IF EXISTS idx_planner_notes_note_on`);
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_notes_owner_note_on ON planner_notes(owner_id, note_on)`,
  );

  await pool().query(`
    CREATE TABLE IF NOT EXISTS recipe_ratings (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id)
    )
  `);
  await pool().query(`
    CREATE TABLE IF NOT EXISTS recipe_notes (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id)
    )
  `);

  await pool().query(`CREATE INDEX IF NOT EXISTS idx_recipes_owner_created ON recipes(owner_id, created_at DESC)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_recipes_visibility_created ON recipes(visibility, created_at DESC)`);

  _accountsReady = true;
}

async function addOwnerId(table: string, ownerId: string | null): Promise<void> {
  await pool().query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id)`);
  if (!ownerId) return;
  await pool().query(`UPDATE ${table} SET owner_id = $1 WHERE owner_id IS NULL`, [ownerId]);
  await pool().query(`ALTER TABLE ${table} ALTER COLUMN owner_id SET NOT NULL`);
}

async function migrateCompositePk(table: string, columns: string[]): Promise<void> {
  const current = await pkColumns(table);
  if (primaryKeyMatches(current, columns)) return;
  const pkey = `${table}_pkey`;
  await pool().query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${pkey}`);
  await pool().query(`ALTER TABLE ${table} ADD PRIMARY KEY (${columns.join(', ')})`);
}

function mapAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: row.id as string,
    login_name: row.login_name as string,
    display_name: row.display_name as string,
    role: parseRole(row.role),
  };
}

export async function getUserByLogin(login: string): Promise<(AuthUser & { password_hash: string }) | null> {
  await ensureAuthTables();
  const result = await pool().query(
    `SELECT id, login_name, display_name, role, password_hash
       FROM users WHERE lower(login_name) = lower($1)`,
    [login.trim()],
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return { ...mapAuthUser(row), password_hash: row.password_hash as string };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  await ensureAuthTables();
  const result = await pool().query(
    `SELECT id, login_name, display_name, role FROM users WHERE id = $1`,
    [id],
  );
  if (!result.rows.length) return null;
  return mapAuthUser(result.rows[0]);
}

export async function getUserWithPassword(id: string): Promise<(AuthUser & { password_hash: string }) | null> {
  await ensureAuthTables();
  const result = await pool().query(
    `SELECT id, login_name, display_name, role, password_hash FROM users WHERE id = $1`,
    [id],
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return { ...mapAuthUser(row), password_hash: row.password_hash as string };
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await ensureAuthTables();
  await pool().query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
}

export async function createUser(data: {
  login_name: string;
  display_name: string;
  password_hash: string;
  role?: Role;
}): Promise<AuthUser> {
  await ensureAuthTables();
  const result = await pool().query(
    `INSERT INTO users (login_name, display_name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, login_name, display_name, role`,
    [data.login_name.trim(), data.display_name.trim(), data.password_hash, data.role ?? 'cook'],
  );
  return mapAuthUser(result.rows[0]);
}

export async function listUsers(): Promise<AuthUser[]> {
  await ensureAuthTables();
  const result = await pool().query(
    `SELECT id, login_name, display_name, role FROM users ORDER BY created_at`,
  );
  return result.rows.map(mapAuthUser);
}

export async function countModerators(): Promise<number> {
  await ensureAuthTables();
  const result = await pool().query(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'moderator'`);
  return result.rows[0].n as number;
}

export async function updateUserRole(id: string, role: Role): Promise<AuthUser | null> {
  await ensureAuthTables();
  const result = await pool().query(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING id, login_name, display_name, role`,
    [id, role],
  );
  if (!result.rows.length) return null;
  return mapAuthUser(result.rows[0]);
}

export async function createSession(userId: string, sessionId: string): Promise<void> {
  await ensureAuthTables();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await pool().query(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, userId, expires.toISOString()],
  );
}

export async function getSessionUser(sessionId: string): Promise<AuthUser | null> {
  await ensureAuthTables();
  const result = await pool().query(
    `SELECT u.id, u.login_name, u.display_name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > NOW()`,
    [sessionId],
  );
  if (!result.rows.length) return null;
  return mapAuthUser(result.rows[0]);
}

export async function touchSession(sessionId: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await pool().query(`UPDATE sessions SET expires_at = $2 WHERE id = $1`, [sessionId, expires.toISOString()]);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await pool().query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}

function recipeListFilter(opts: {
  viewerId: string | null;
  includePublic?: boolean;
  ownedOnly?: boolean;
}): { where: string; params: unknown[] } {
  const viewerId = opts.viewerId;
  let where: string;
  const params: unknown[] = [];
  if (!viewerId) {
    where = `r.visibility = 'public'`;
  } else if (opts.ownedOnly || !opts.includePublic) {
    where = `r.owner_id = $1`;
    params.push(viewerId);
  } else {
    where = `(r.owner_id = $1 OR r.visibility = 'public')`;
    params.push(viewerId);
  }
  return { where, params };
}

/** Full recipes including ingredients and steps. Used by retag and the ingredient dictionary. */
export async function listRecipes(opts: {
  viewerId: string | null;
  includePublic?: boolean;
  ownedOnly?: boolean;
}): Promise<Recipe[]> {
  await ensureAccountsSchema();
  const viewerId = opts.viewerId;
  const { where, params } = recipeListFilter(opts);

  const ratingJoin = viewerId
    ? `LEFT JOIN recipe_ratings rr ON rr.recipe_id = r.id AND rr.user_id = $${params.length + 1}
       LEFT JOIN recipe_notes rn ON rn.recipe_id = r.id AND rn.user_id = $${params.length + 1}`
    : '';
  if (viewerId) params.push(viewerId);

  const result = await pool().query(
    `SELECT r.*, u.display_name AS owner_display_name
            ${viewerId ? ', rr.stars AS my_rating, rn.note AS my_note' : ''}
       FROM recipes r
       JOIN users u ON u.id = r.owner_id
       ${ratingJoin}
      WHERE ${where}
      ORDER BY r.created_at DESC`,
    params,
  );
  return result.rows.map(row => normalizeRecipe(row, viewerId));
}

/** Cookbook grid: card fields only. Does not migrate schema. */
export async function listRecipeCards(opts: {
  viewerId: string | null;
  includePublic?: boolean;
  ownedOnly?: boolean;
}): Promise<Recipe[]> {
  const viewerId = opts.viewerId;
  const { where, params } = recipeListFilter(opts);

  const ratingJoin = viewerId
    ? `LEFT JOIN recipe_ratings rr ON rr.recipe_id = r.id AND rr.user_id = $${params.length + 1}`
    : '';
  if (viewerId) params.push(viewerId);

  const result = await pool().query(
    `SELECT r.id, r.title, r.description, r.source_url, r.image_url, r.servings,
            r.prep_time, r.cook_time, r.tags, r.primary_protein, r.created_at, r.updated_at,
            r.owner_id, r.visibility, u.display_name AS owner_display_name
            ${viewerId ? ', rr.stars AS my_rating' : ''}
       FROM recipes r
       JOIN users u ON u.id = r.owner_id
       ${ratingJoin}
      WHERE ${where}
      ORDER BY r.created_at DESC`,
    params,
  );
  return result.rows.map(row => normalizeRecipe(row, viewerId, { includeMethod: false }));
}

export async function getAllRecipes(): Promise<Recipe[]> {
  await ensureAccountsSchema();
  const result = await pool().query(
    `SELECT r.*, u.display_name AS owner_display_name
       FROM recipes r JOIN users u ON u.id = r.owner_id
      ORDER BY r.created_at DESC`,
  );
  return result.rows.map(row => normalizeRecipe(row, null));
}

export async function getRecipeById(id: string, viewerId?: string | null): Promise<Recipe | null> {
  const params: unknown[] = [id];
  const ratingJoin = viewerId
    ? `LEFT JOIN recipe_ratings rr ON rr.recipe_id = r.id AND rr.user_id = $2
       LEFT JOIN recipe_notes rn ON rn.recipe_id = r.id AND rn.user_id = $2`
    : '';
  if (viewerId) params.push(viewerId);
  const result = await pool().query(
    `SELECT r.*, u.display_name AS owner_display_name
            ${viewerId ? ', rr.stars AS my_rating, rn.note AS my_note' : ''}
       FROM recipes r
       JOIN users u ON u.id = r.owner_id
       ${ratingJoin}
      WHERE r.id = $1`,
    params,
  );
  if (result.rows.length === 0) return null;
  return normalizeRecipe(result.rows[0], viewerId ?? null);
}

export async function createRecipe(
  data: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'owner_display_name' | 'can_edit' | 'can_publish' | 'my_rating' | 'my_note'>,
): Promise<Recipe> {
  await ensureAccountsSchema();
  // Auto-tag on save: infer the primary protein when the caller didn't set one,
  // and enrich tags. This is the universal chokepoint, so every recipe — scraped,
  // pasted, or hand-entered — gets tagged even if the client sent nothing.
  const auto = autoTag(data.title, data.ingredients || [], data.tags || []);
  const primaryProtein = data.primary_protein || auto.primary_protein || null;
  const tags = auto.tags;
  const visibility = parseVisibility(data.visibility);

  const result = await pool().query(
    `INSERT INTO recipes (title, description, source_url, image_url, servings, prep_time, cook_time, ingredients, steps, tags, primary_protein, owner_id, visibility)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,
             ARRAY(SELECT jsonb_array_elements_text($10::jsonb)),$11,$12,$13)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.source_url || null,
      data.image_url || null,
      data.servings || 4,
      data.prep_time || null,
      data.cook_time || null,
      JSON.stringify(data.ingredients || []),
      JSON.stringify(data.steps || []),
      JSON.stringify(tags),
      primaryProtein,
      data.owner_id,
      visibility,
    ]
  );
  return (await getRecipeById(result.rows[0].id, data.owner_id))!;
}

export async function updateRecipe(
  id: string,
  data: Partial<Omit<Recipe, 'id' | 'created_at'>>
): Promise<Recipe | null> {
  const result = await pool().query(
    `UPDATE recipes SET
      title       = COALESCE($1, title),
      description = COALESCE($2, description),
      source_url  = COALESCE($3, source_url),
      image_url   = COALESCE($4, image_url),
      servings    = COALESCE($5, servings),
      prep_time   = COALESCE($6, prep_time),
      cook_time   = COALESCE($7, cook_time),
      ingredients = COALESCE($8::jsonb, ingredients),
      steps       = COALESCE($9::jsonb, steps),
      primary_protein = COALESCE($10::text, primary_protein),
      tags        = COALESCE(
                     CASE WHEN $11::text IS NOT NULL
                       THEN ARRAY(SELECT jsonb_array_elements_text($11::jsonb))
                       ELSE NULL END,
                     tags),
      updated_at  = NOW()
     WHERE id = $12
     RETURNING *`,
    [
      data.title || null,
      data.description || null,
      data.source_url || null,
      data.image_url || null,
      data.servings || null,
      data.prep_time || null,
      data.cook_time || null,
      data.ingredients ? JSON.stringify(data.ingredients) : null,
      data.steps ? JSON.stringify(data.steps) : null,
      data.primary_protein !== undefined ? data.primary_protein || null : null,
      data.tags ? JSON.stringify(data.tags) : null,
      id,
    ]
  );
  if (result.rows.length === 0) return null;
  return getRecipeById(id);
}

export async function deleteRecipe(id: string, ownerId: string): Promise<boolean> {
  const result = await pool().query('DELETE FROM recipes WHERE id = $1 AND owner_id = $2', [id, ownerId]);
  return (result.rowCount ?? 0) > 0;
}

export async function setRecipeVisibility(id: string, visibility: Visibility): Promise<Recipe | null> {
  await ensureAccountsSchema();
  const result = await pool().query(
    `UPDATE recipes SET visibility = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id, visibility],
  );
  if (!result.rows.length) return null;
  return getRecipeById(id);
}

export async function duplicateRecipe(id: string, ownerId: string): Promise<Recipe | null> {
  await ensureAccountsSchema();
  const source = await getRecipeById(id);
  if (!source) return null;
  return createRecipe({
    title: source.title,
    description: source.description,
    source_url: source.source_url,
    image_url: source.image_url,
    servings: source.servings,
    prep_time: source.prep_time,
    cook_time: source.cook_time,
    ingredients: source.ingredients || [],
    steps: source.steps || [],
    tags: source.tags,
    primary_protein: source.primary_protein,
    owner_id: ownerId,
    visibility: 'private',
  });
}

export async function setRecipeRating(userId: string, recipeId: string, stars: number | null): Promise<void> {
  await ensureAccountsSchema();
  if (stars == null) {
    await pool().query(`DELETE FROM recipe_ratings WHERE user_id = $1 AND recipe_id = $2`, [userId, recipeId]);
    return;
  }
  await pool().query(
    `INSERT INTO recipe_ratings (user_id, recipe_id, stars)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, recipe_id) DO UPDATE SET stars = $3, updated_at = NOW()`,
    [userId, recipeId, stars],
  );
}

export async function setRecipeNote(userId: string, recipeId: string, note: string): Promise<void> {
  await ensureAccountsSchema();
  if (!note.trim()) {
    await pool().query(`DELETE FROM recipe_notes WHERE user_id = $1 AND recipe_id = $2`, [userId, recipeId]);
    return;
  }
  await pool().query(
    `INSERT INTO recipe_notes (user_id, recipe_id, note)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, recipe_id) DO UPDATE SET note = $3, updated_at = NOW()`,
    [userId, recipeId, note.trim()],
  );
}

let _plannedOnReady = false;
const PLANNED_ON_SQL = `CASE
        WHEN EXTRACT(ISODOW FROM week_start) = 1 THEN week_start + day_of_week
        ELSE week_start + ((8 - EXTRACT(ISODOW FROM week_start))::int) + day_of_week
      END`;

export async function ensurePlannedOnColumns(): Promise<void> {
  if (_plannedOnReady) return;
  await pool().query(`ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS planned_on DATE`);
  await pool().query(
    `UPDATE meal_plans SET planned_on = (${PLANNED_ON_SQL}) WHERE planned_on IS NULL`,
  );
  await pool().query(`
    UPDATE meal_plans SET
      week_start = planned_on - ((EXTRACT(ISODOW FROM planned_on) - 1)::int),
      day_of_week = (EXTRACT(ISODOW FROM planned_on) - 1)::int
    WHERE planned_on IS NOT NULL
  `);
  await pool().query(`ALTER TABLE meal_plans ALTER COLUMN planned_on SET NOT NULL`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_meal_plans_planned_on ON meal_plans(planned_on)`);
  await pool().query(`ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id)`);
  await pool().query(`CREATE INDEX IF NOT EXISTS idx_meal_plans_owner_planned_on ON meal_plans(owner_id, planned_on)`);

  await pool().query(`ALTER TABLE planner_notes ADD COLUMN IF NOT EXISTS note_on DATE`);
  await pool().query(
    `UPDATE planner_notes SET note_on = (${PLANNED_ON_SQL}) WHERE note_on IS NULL`,
  );
  await pool().query(`
    UPDATE planner_notes SET
      week_start = note_on - ((EXTRACT(ISODOW FROM note_on) - 1)::int),
      day_of_week = (EXTRACT(ISODOW FROM note_on) - 1)::int
    WHERE note_on IS NOT NULL
  `);
  await pool().query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_notes_note_on ON planner_notes(note_on)`);
  _plannedOnReady = true;
}

function mapMealPlanRow(
  row: Record<string, unknown>,
  viewerId: string,
  opts: { includeMethod?: boolean } = {},
): MealPlan {
  const includeMethod = opts.includeMethod === true;
  const recipe: Recipe = {
    id: row.recipe_id as string,
    title: row.recipe_title as string,
    description: row.recipe_description as string,
    image_url: row.recipe_image_url as string,
    servings: row.recipe_servings as number,
    prep_time: row.recipe_prep_time as number,
    cook_time: row.recipe_cook_time as number,
    tags: (row.recipe_tags as string[]) ?? [],
    primary_protein: row.recipe_primary_protein as string,
    source_url: row.recipe_source_url as string,
    created_at: row.recipe_created_at as string,
    updated_at: row.recipe_updated_at as string,
    owner_id: row.recipe_owner_id as string,
    visibility: parseVisibility(row.recipe_visibility),
    can_edit: viewerId === (row.recipe_owner_id as string),
  };
  if (includeMethod) {
    recipe.ingredients = (row.recipe_ingredients as Recipe['ingredients']) ?? [];
    recipe.steps = (row.recipe_steps as string[]) ?? [];
  }
  return {
    id: row.id as string,
    planned_on: toDayIso(row.planned_on as string | Date),
    week_start: toDayIso(row.week_start as string | Date),
    recipe_id: row.recipe_id as string,
    day_of_week: row.day_of_week as number,
    meal_type: row.meal_type as string,
    servings: row.servings as number,
    recipe,
  };
}

const MEAL_PLAN_RECIPE_CARD = `
            r.title       AS recipe_title,
            r.description AS recipe_description,
            r.image_url   AS recipe_image_url,
            r.servings    AS recipe_servings,
            r.prep_time   AS recipe_prep_time,
            r.cook_time   AS recipe_cook_time,
            r.tags        AS recipe_tags,
            r.primary_protein AS recipe_primary_protein,
            r.source_url  AS recipe_source_url,
            r.created_at  AS recipe_created_at,
            r.updated_at  AS recipe_updated_at,
            r.owner_id    AS recipe_owner_id,
            r.visibility  AS recipe_visibility`;

export function mealPlanSelectSql(includeMethod: boolean): string {
  const methodCols = includeMethod
    ? `,
            r.ingredients AS recipe_ingredients,
            r.steps       AS recipe_steps`
    : '';
  return `SELECT mp.*,${MEAL_PLAN_RECIPE_CARD}${methodCols}
     FROM meal_plans mp
     JOIN recipes r ON mp.recipe_id = r.id`;
}

export async function getMealPlansForWeeks(
  weekStarts: string[],
  ownerId: string,
  opts: { includeMethod?: boolean } = {},
): Promise<MealPlan[]> {
  if (!weekStarts.length) return [];
  const includeMethod = opts.includeMethod === true;
  const spans = weekStarts.map(weekSpanForStoredKey);
  const clauses = spans.map((_, i) => `(mp.planned_on >= $${i * 2 + 1}::date AND mp.planned_on <= $${i * 2 + 2}::date)`);
  const params = spans.flatMap(span => [span.from, span.to]);
  const result = await pool().query(
    `${mealPlanSelectSql(includeMethod)}
     WHERE mp.owner_id = $${params.length + 2}
       AND (${clauses.join(' OR ')}
        OR mp.week_start = ANY($${params.length + 1}::date[]))
     ORDER BY mp.planned_on, mp.meal_type`,
    [...params, weekStarts, ownerId],
  );
  return result.rows.map(row => mapMealPlanRow(row, ownerId, { includeMethod }));
}

/** Inclusive planned_on window. Name kept so existing callers keep working. */
export async function getMealPlansInDateWindow(
  from: string,
  to: string,
  ownerId: string,
  opts: { includeMethod?: boolean } = {},
): Promise<MealPlan[]> {
  const includeMethod = opts.includeMethod === true;
  const result = await pool().query(
    `${mealPlanSelectSql(includeMethod)}
     WHERE mp.owner_id = $3 AND mp.planned_on >= $1::date AND mp.planned_on <= $2::date
     ORDER BY mp.planned_on, mp.meal_type`,
    [from, to, ownerId],
  );
  return result.rows.map(row => mapMealPlanRow(row, ownerId, { includeMethod }));
}

export async function getMealPlanForWeek(
  weekStart: string,
  ownerId: string,
  opts: { includeMethod?: boolean } = {},
): Promise<MealPlan[]> {
  return getMealPlansForWeeks([weekStart], ownerId, opts);
}

export async function addToMealPlan(data: {
  planned_on?: string;
  week_start: string;
  recipe_id: string;
  day_of_week: unknown;
  meal_type: string;
  servings: number;
  owner_id: string;
}): Promise<MealPlan> {
  await ensurePlannedOnColumns();
  await ensureAccountsSchema();
  const plannedOn = data.planned_on
    ? String(data.planned_on).slice(0, 10)
    : inferPlannedOn(String(data.week_start).slice(0, 10), data.day_of_week);
  const coords = coordsFromPlannedOn(plannedOn);
  const result = await pool().query(
    `INSERT INTO meal_plans (planned_on, week_start, recipe_id, day_of_week, meal_type, servings, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [plannedOn, coords.weekStart, data.recipe_id, coords.dayOfWeek, data.meal_type, data.servings, data.owner_id]
  );
  const plans = await pool().query(
    `${mealPlanSelectSql(false)} WHERE mp.id = $1`,
    [result.rows[0].id],
  );
  return mapMealPlanRow(plans.rows[0], data.owner_id);
}

export async function removeFromMealPlan(id: string, ownerId: string): Promise<boolean> {
  const result = await pool().query(
    'DELETE FROM meal_plans WHERE id = $1 AND owner_id = $2',
    [id, ownerId],
  );
  return (result.rowCount ?? 0) > 0;
}

function normalizeRecipe(
  row: Record<string, unknown>,
  viewerId: string | null = null,
  opts: { includeMethod?: boolean } = {},
): Recipe {
  const ownerId = row.owner_id as string;
  const includeMethod = opts.includeMethod !== false;
  const recipe = {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    owner_id: ownerId,
    visibility: parseVisibility(row.visibility),
    owner_display_name: (row.owner_display_name as string) || undefined,
    can_edit: !!viewerId && viewerId === ownerId,
    my_rating: row.my_rating == null ? null : Number(row.my_rating),
  } as Recipe;
  if (includeMethod) {
    recipe.ingredients = Array.isArray(row.ingredients) ? row.ingredients : [];
    recipe.steps = Array.isArray(row.steps) ? row.steps : [];
    recipe.my_note = (row.my_note as string) || null;
  } else {
    delete recipe.ingredients;
    delete recipe.steps;
    delete recipe.my_note;
  }
  return recipe;
}

export async function getPlannerNotes(weekStart: string, ownerId: string): Promise<Record<number, string>> {
  const span = weekSpanForStoredKey(weekStart);
  const result = await pool().query(
    `SELECT day_of_week, note FROM planner_notes
     WHERE owner_id = $4 AND ((note_on >= $1::date AND note_on <= $2::date) OR week_start = $3::date)`,
    [span.from, span.to, weekStart, ownerId],
  );
  const map: Record<number, string> = {};
  for (const row of result.rows) map[row.day_of_week] = row.note;
  return map;
}

export async function getPlannerNotesInRange(
  from: string,
  to: string,
  ownerId: string,
): Promise<Record<string, string>> {
  const result = await pool().query(
    `SELECT note_on, week_start, day_of_week, note FROM planner_notes
     WHERE owner_id = $3
       AND (
         (note_on >= $1::date AND note_on <= $2::date)
         OR (week_start >= $1::date AND week_start <= $2::date)
       )`,
    [from, to, ownerId],
  );
  const map: Record<string, string> = {};
  for (const row of result.rows) {
    const on = row.note_on
      ? toDayIso(row.note_on as string | Date)
      : inferPlannedOn(toDayIso(row.week_start as string | Date), row.day_of_week);
    if (on >= from && on <= to) map[on] = row.note as string;
  }
  return map;
}

export async function setPlannerNote(weekStart: string, dayOfWeek: number, note: string, ownerId: string): Promise<void> {
  await ensurePlannedOnColumns();
  await ensureAccountsSchema();
  const plannedOn = inferPlannedOn(weekStart, dayOfWeek);
  const coords = coordsFromPlannedOn(plannedOn);
  if (!note.trim()) {
    await pool().query(
      'DELETE FROM planner_notes WHERE owner_id = $4 AND (note_on = $1 OR (week_start = $2 AND day_of_week = $3))',
      [plannedOn, coords.weekStart, coords.dayOfWeek, ownerId],
    );
  } else {
    await pool().query(
      `INSERT INTO planner_notes (note_on, week_start, day_of_week, note, owner_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (owner_id, week_start, day_of_week) DO UPDATE SET note = $4, note_on = $1, updated_at = NOW()`,
      [plannedOn, coords.weekStart, coords.dayOfWeek, note.trim(), ownerId],
    );
  }
}

export interface ShoppingList {
  id: string;
  name: string;
  subtitle: string;
  week_starts: string[];
  recipe_ids: string[];
  generated_at: string;
  items:           unknown[];
  item_overrides:  Record<string, unknown>;
  custom_items:    unknown[];
  category_labels: Record<string, string>;
  category_order:  string[];
  item_order:      Record<string, string[]>;
  checked_state:   Record<string, unknown>;
  recipe_sources?: Record<string, string>;
}

function rowToShoppingList(r: Record<string, unknown>): ShoppingList {
  return {
    id: r.id as string, name: r.name as string, subtitle: (r.subtitle as string) ?? '',
    week_starts: (r.week_starts as string[]) ?? [], recipe_ids: (r.recipe_ids as string[]) ?? [],
    generated_at: r.generated_at as string,
    items: (r.items as unknown[]) ?? [],
    item_overrides: (r.item_overrides as Record<string, unknown>) ?? {},
    custom_items: (r.custom_items as unknown[]) ?? [],
    category_labels: (r.category_labels as Record<string, string>) ?? {},
    category_order: (r.category_order as string[]) ?? [],
    item_order: (r.item_order as Record<string, string[]>) ?? {},
    checked_state: (r.checked_state as Record<string, unknown>) ?? {},
  };
}

export async function getAllShoppingLists(ownerId: string): Promise<ShoppingListMeta[]> {
  const result = await pool().query(
    `${shoppingListMetaSelectSql()} WHERE owner_id = $1 ORDER BY generated_at DESC`,
    [ownerId],
  );
  return result.rows.map(toShoppingListMeta);
}

export async function createShoppingList(data: {
  name: string; subtitle: string; week_starts: string[]; recipe_ids: string[]; items: unknown[]; owner_id: string;
}): Promise<ShoppingList> {
  await ensureAccountsSchema();
  const result = await pool().query(
    `INSERT INTO shopping_lists (name, subtitle, week_starts, recipe_ids, items, owner_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING *`,
    [data.name, data.subtitle, data.week_starts, data.recipe_ids, JSON.stringify(data.items), data.owner_id]
  );
  return rowToShoppingList(result.rows[0]);
}

export async function updateShoppingListEdits(id: string, ownerId: string, edits: {
  items?: unknown[];
  item_overrides?: Record<string, unknown>;
  custom_items?: unknown[];
  category_labels?: Record<string, string>;
  category_order?: string[];
  item_order?: Record<string, string[]>;
  checked_state?: Record<string, unknown>;
  subtitle?: string;
}): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [id];
  let i = 2;
  if (edits.items !== undefined) { sets.push(`items=$${i++}::jsonb`); vals.push(JSON.stringify(edits.items)); }
  if (edits.item_overrides !== undefined) { sets.push(`item_overrides=$${i++}::jsonb`); vals.push(JSON.stringify(edits.item_overrides)); }
  if (edits.custom_items !== undefined) { sets.push(`custom_items=$${i++}::jsonb`); vals.push(JSON.stringify(edits.custom_items)); }
  if (edits.category_labels !== undefined) { sets.push(`category_labels=$${i++}::jsonb`); vals.push(JSON.stringify(edits.category_labels)); }
  if (edits.category_order !== undefined) { sets.push(`category_order=$${i++}::jsonb`); vals.push(JSON.stringify(edits.category_order)); }
  if (edits.item_order !== undefined) { sets.push(`item_order=$${i++}::jsonb`); vals.push(JSON.stringify(edits.item_order)); }
  if (edits.checked_state !== undefined) { sets.push(`checked_state=$${i++}::jsonb`); vals.push(JSON.stringify(edits.checked_state)); }
  if (edits.subtitle !== undefined) { sets.push(`subtitle=$${i++}`); vals.push(edits.subtitle); }
  if (!sets.length) return;
  vals.push(ownerId);
  await pool().query(`UPDATE shopping_lists SET ${sets.join(',')} WHERE id=$1 AND owner_id=$${i}`, vals);
}

// Apply a sequence of targeted operations to a shopping list. Each op is a
// single atomic JSONB UPDATE, so concurrent edits to different keys/items
// compose instead of clobbering each other (the whole point of op-based sync).
export async function applyShoppingListOps(id: string, ops: ShoppingOp[], ownerId: string): Promise<{ applied: boolean }> {
  const owned = await pool().query('SELECT 1 FROM shopping_lists WHERE id = $1 AND owner_id = $2', [id, ownerId]);
  if (!owned.rows.length) return { applied: false };
  for (const op of ops) {
    switch (op.t) {
      case 'override':
        // merge patch into item_overrides[key]
        await pool().query(
          `UPDATE shopping_lists
             SET item_overrides = jsonb_set(
               COALESCE(item_overrides, '{}'::jsonb), ARRAY[$2],
               COALESCE(item_overrides->$2, '{}'::jsonb) || $3::jsonb, true)
           WHERE id = $1`,
          [id, op.key, JSON.stringify(op.patch)]
        );
        break;
      case 'addCustom': {
        const item = customItemPayload((op.item as Record<string, unknown>) ?? {});
        const itemId = String(item.id ?? '');
        await pool().query(shoppingListAddItemSql(), [id, itemId, JSON.stringify(item)]);
        break;
      }
      case 'updateCustom':
        await pool().query(shoppingListUpdateItemSql(), [id, op.id, JSON.stringify(op.patch)]);
        break;
      case 'removeCustom':
        await pool().query(shoppingListRemoveItemSql(), [id, op.id]);
        break;
      case 'setLabel':
        if (op.label === null) {
          await pool().query(
            `UPDATE shopping_lists SET category_labels = COALESCE(category_labels, '{}'::jsonb) - $2 WHERE id = $1`,
            [id, op.cat]
          );
        } else {
          await pool().query(
            `UPDATE shopping_lists
               SET category_labels = jsonb_set(COALESCE(category_labels, '{}'::jsonb), ARRAY[$2], to_jsonb($3::text), true)
             WHERE id = $1`,
            [id, op.cat, op.label]
          );
        }
        break;
      case 'setCategoryOrder':
        await pool().query(
          `UPDATE shopping_lists SET category_order = $2::jsonb WHERE id = $1`,
          [id, JSON.stringify(op.order)]
        );
        break;
      case 'setItemOrder':
        await pool().query(
          `UPDATE shopping_lists
             SET item_order = jsonb_set(COALESCE(item_order, '{}'::jsonb), ARRAY[$2], $3::jsonb, true)
           WHERE id = $1`,
          [id, op.cat, JSON.stringify(op.order)]
        );
        break;
      case 'check': {
        const on = checkOpIsOn(op);
        const { itemId, contributionIndex } = splitCheckKey(op.key);
        if (contributionIndex != null) {
          await pool().query(shoppingListContributionCheckSql(), [id, itemId, String(contributionIndex), on]);
        } else {
          await pool().query(shoppingListItemCheckSql(), [id, itemId, on]);
        }
        break;
      }
      case 'clearChecked':
        await pool().query(shoppingListClearCheckedSql(), [id]);
        break;
      case 'setSubtitle':
        await pool().query(`UPDATE shopping_lists SET subtitle = $2 WHERE id = $1`, [id, op.subtitle]);
        break;
    }
  }
  return { applied: true };
}

export async function deleteShoppingList(id: string, ownerId: string): Promise<void> {
  await pool().query('DELETE FROM shopping_lists WHERE id = $1 AND owner_id = $2', [id, ownerId]);
}

export async function getShoppingListById(id: string, ownerId: string): Promise<ShoppingList | null> {
  const result = await pool().query('SELECT * FROM shopping_lists WHERE id=$1 AND owner_id=$2', [id, ownerId]);
  if (!result.rows.length) return null;
  const list = rowToShoppingList(result.rows[0]);
  const { list: migrated, changed } = migrateShoppingListShape(list);
  // Lists created before items had ids are upgraded in place on first read, so
  // every later edit keys off the new id rather than the name.
  if (changed) {
    try {
      await updateShoppingListEdits(id, ownerId, {
        items: migrated.items,
        item_overrides: migrated.item_overrides,
        custom_items: [],
        checked_state: {},
        item_order: migrated.item_order,
      });
    } catch { /* best-effort: still serve the migrated shape even if write-back fails */ }
  }
  let recipe_sources: Record<string, string> = {};
  try {
    recipe_sources = await recipeSourcesForIds(migrated.recipe_ids);
  } catch { /* pills stay unlinked; still serve items and checks */ }
  return { ...migrated, recipe_sources };
}

async function recipeSourcesForIds(ids: string[]): Promise<Record<string, string>> {
  const valid = ids.filter(Boolean);
  if (!valid.length) return {};
  const result = await pool().query(
    `SELECT title, source_url FROM recipes WHERE id::text = ANY($1::text[])`,
    [valid],
  );
  return recipeSourceMapFromRecipes(result.rows);
}
