// Run with: node scripts/setup-db.js
// Or use the /api/setup endpoint on first deploy

const { sql } = require('@vercel/postgres');

async function setup() {
  await sql`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL,
      recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      meal_type TEXT DEFAULT 'dinner',
      servings INTEGER DEFAULT 4,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON meal_plans(week_start);
    CREATE INDEX IF NOT EXISTS idx_recipes_created ON recipes(created_at DESC);
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS planned_on DATE;
    CREATE INDEX IF NOT EXISTS idx_meal_plans_planned_on ON meal_plans(planned_on);
  `;
  console.log('Database setup complete');
}

setup().catch(console.error);
