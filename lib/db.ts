import { Pool } from 'pg';
import { autoTag } from './autotag';

// Vercel Postgres gives us POSTGRES_URL as the pooled connection string.
// We use the raw `pg` driver to avoid @vercel/postgres wrapper confusion.
let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    const connectionString = process.env.POSTGRES_URL ||
      'postgresql://neondb_owner:npg_Da4LVXg8EdHB@ep-purple-glitter-a773calm.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
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
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  primary_protein?: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlan {
  id: string;
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
  // Named shopping lists. checked_state lives here too and is owned by the
  // socket layer (server.js); structural edit columns are owned by the HTTP API.
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
}

export async function getAllRecipes(): Promise<Recipe[]> {
  const result = await pool().query('SELECT * FROM recipes ORDER BY created_at DESC');
  return result.rows.map(normalizeRecipe);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const result = await pool().query('SELECT * FROM recipes WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return normalizeRecipe(result.rows[0]);
}

export async function createRecipe(
  data: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>
): Promise<Recipe> {
  // Auto-tag on save: infer the primary protein when the caller didn't set one,
  // and enrich tags. This is the universal chokepoint, so every recipe — scraped,
  // pasted, or hand-entered — gets tagged even if the client sent nothing.
  const auto = autoTag(data.title, data.ingredients || [], data.tags || []);
  const primaryProtein = data.primary_protein || auto.primary_protein || null;
  const tags = auto.tags;

  const result = await pool().query(
    `INSERT INTO recipes (title, description, source_url, image_url, servings, prep_time, cook_time, ingredients, steps, tags, primary_protein)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,
             ARRAY(SELECT jsonb_array_elements_text($10::jsonb)),$11)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.source_url || null,
      data.image_url || null,
      data.servings || 4,
      data.prep_time || null,
      data.cook_time || null,
      JSON.stringify(data.ingredients),
      JSON.stringify(data.steps),
      JSON.stringify(tags),
      primaryProtein,
    ]
  );
  return normalizeRecipe(result.rows[0]);
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
      primary_protein = COALESCE($11, primary_protein),
      tags        = COALESCE(
                     CASE WHEN $12::text IS NOT NULL
                       THEN ARRAY(SELECT jsonb_array_elements_text($12::jsonb))
                       ELSE NULL END,
                     tags),
      updated_at  = NOW()
     WHERE id = $13
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
  return normalizeRecipe(result.rows[0]);
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const result = await pool().query('DELETE FROM recipes WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getMealPlanForWeek(weekStart: string): Promise<MealPlan[]> {
  const result = await pool().query(
    `SELECT mp.*,
            r.title       AS recipe_title,
            r.description AS recipe_description,
            r.image_url   AS recipe_image_url,
            r.ingredients AS recipe_ingredients,
            r.steps       AS recipe_steps,
            r.servings    AS recipe_servings,
            r.prep_time   AS recipe_prep_time,
            r.cook_time   AS recipe_cook_time,
            r.tags        AS recipe_tags,
            r.primary_protein AS recipe_primary_protein,
            r.source_url  AS recipe_source_url,
            r.created_at  AS recipe_created_at,
            r.updated_at  AS recipe_updated_at
     FROM meal_plans mp
     JOIN recipes r ON mp.recipe_id = r.id
     WHERE mp.week_start = $1
     ORDER BY mp.day_of_week, mp.meal_type`,
    [weekStart]
  );
  return result.rows.map((row) => ({
    id: row.id,
    week_start: row.week_start,
    recipe_id: row.recipe_id,
    day_of_week: row.day_of_week,
    meal_type: row.meal_type,
    servings: row.servings,
    recipe: {
      id: row.recipe_id,
      title: row.recipe_title,
      description: row.recipe_description,
      image_url: row.recipe_image_url,
      ingredients: row.recipe_ingredients ?? [],
      steps: row.recipe_steps ?? [],
      servings: row.recipe_servings,
      prep_time: row.recipe_prep_time,
      cook_time: row.recipe_cook_time,
      tags: row.recipe_tags ?? [],
      primary_protein: row.recipe_primary_protein,
      source_url: row.recipe_source_url,
      created_at: row.recipe_created_at,
      updated_at: row.recipe_updated_at,
    },
  }));
}

export async function addToMealPlan(data: Omit<MealPlan, 'id'>): Promise<MealPlan> {
  const result = await pool().query(
    `INSERT INTO meal_plans (week_start, recipe_id, day_of_week, meal_type, servings)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.week_start, data.recipe_id, data.day_of_week, data.meal_type, data.servings]
  );
  return result.rows[0] as MealPlan;
}

export async function removeFromMealPlan(id: string): Promise<boolean> {
  const result = await pool().query('DELETE FROM meal_plans WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

function normalizeRecipe(row: Record<string, unknown>): Recipe {
  return {
    ...row,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  } as Recipe;
}

export async function getPlannerNotes(weekStart: string): Promise<Record<number, string>> {
  const result = await pool().query(
    'SELECT day_of_week, note FROM planner_notes WHERE week_start = $1',
    [weekStart]
  );
  const map: Record<number, string> = {};
  for (const row of result.rows) map[row.day_of_week] = row.note;
  return map;
}

export async function setPlannerNote(weekStart: string, dayOfWeek: number, note: string): Promise<void> {
  if (!note.trim()) {
    await pool().query('DELETE FROM planner_notes WHERE week_start = $1 AND day_of_week = $2', [weekStart, dayOfWeek]);
  } else {
    await pool().query(
      `INSERT INTO planner_notes (week_start, day_of_week, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (week_start, day_of_week) DO UPDATE SET note = $3, updated_at = NOW()`,
      [weekStart, dayOfWeek, note.trim()]
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
  checked_state:   Record<string, { checked: boolean; checkedBy: string; checkedAt: number }>;
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
    checked_state: (r.checked_state as Record<string, { checked: boolean; checkedBy: string; checkedAt: number }>) ?? {},
  };
}

export async function getAllShoppingLists(): Promise<ShoppingList[]> {
  const result = await pool().query('SELECT * FROM shopping_lists ORDER BY generated_at DESC');
  return result.rows.map(rowToShoppingList);
}

export async function createShoppingList(data: {
  name: string; subtitle: string; week_starts: string[]; recipe_ids: string[]; items: unknown[];
}): Promise<ShoppingList> {
  const result = await pool().query(
    `INSERT INTO shopping_lists (name, subtitle, week_starts, recipe_ids, items)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [data.name, data.subtitle, data.week_starts, data.recipe_ids, JSON.stringify(data.items)]
  );
  return rowToShoppingList(result.rows[0]);
}

export async function updateShoppingListEdits(id: string, edits: {
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
  await pool().query(`UPDATE shopping_lists SET ${sets.join(',')} WHERE id=$1`, vals);
}

export async function deleteShoppingList(id: string): Promise<void> {
  await pool().query('DELETE FROM shopping_lists WHERE id = $1', [id]);
}

export async function getShoppingListById(id: string): Promise<ShoppingList | null> {
  const result = await pool().query('SELECT * FROM shopping_lists WHERE id=$1', [id]);
  if (!result.rows.length) return null;
  return rowToShoppingList(result.rows[0]);
}
