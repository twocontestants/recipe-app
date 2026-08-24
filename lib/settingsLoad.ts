import { CATEGORY_ORDER, categorizeIngredient, normalizeIngredientName } from './shopping';

export const PREFERENCE_KEYS = ['categoryPrefMode', 'weekStartDay'] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type DictionaryEntry = {
  name: string;
  category: string;
  autoCategory: string;
  source: 'custom' | 'auto';
  count: number;
  examples: string[];
};

export function ownedIngredientsSelectSql(): string {
  return 'SELECT r.id, r.ingredients FROM recipes r';
}

export function preferenceSettingsSelectSql(): string {
  return 'SELECT key, value FROM app_settings WHERE owner_id = $1 AND key = ANY($2::text[])';
}

export function aggregateIngredientDictionary(
  recipes: Array<{ ingredients?: Array<{ name?: string }> }>,
  overrides: Record<string, string>,
): { entries: DictionaryEntry[]; categories: string[] } {
  const agg = new Map<string, { count: number; examples: Set<string> }>();
  for (const recipe of recipes) {
    const seen = new Set<string>();
    for (const ingredient of recipe.ingredients ?? []) {
      const norm = normalizeIngredientName(ingredient.name ?? '');
      if (!norm) continue;
      const entry = agg.get(norm) ?? { count: 0, examples: new Set<string>() };
      if (!seen.has(norm)) {
        entry.count += 1;
        seen.add(norm);
      }
      const raw = ingredient.name?.trim() ?? '';
      if (raw && entry.examples.size < 3) entry.examples.add(raw);
      agg.set(norm, entry);
    }
  }

  for (const name of Object.keys(overrides)) {
    if (!agg.has(name)) agg.set(name, { count: 0, examples: new Set<string>() });
  }

  const entries: DictionaryEntry[] = [...agg.entries()].map(([name, { count, examples }]) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, name);
    const autoCategory = categorizeIngredient(name);
    return {
      name,
      category: hasOverride ? overrides[name] : autoCategory,
      autoCategory,
      source: hasOverride ? 'custom' : 'auto',
      count,
      examples: [...examples],
    };
  });

  entries.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name);
  });

  const customCats = [...new Set(Object.values(overrides))].filter(c => !CATEGORY_ORDER.includes(c));
  const categories = [...CATEGORY_ORDER, ...customCats];
  return { entries, categories };
}
