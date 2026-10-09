/** Display rules for the shopping list. Keep layout math out of the React tree. */

export type ShoppingProgress = {
  checked: number;
  total: number;
  percent: number;
  label: string;
};

export function shoppingProgress(checked: number, total: number): ShoppingProgress {
  const safeChecked = Math.max(0, Math.min(checked, Math.max(0, total)));
  const safeTotal = Math.max(0, total);
  const percent = safeTotal > 0 ? Math.round((safeChecked / safeTotal) * 100) : 0;
  return {
    checked: safeChecked,
    total: safeTotal,
    percent,
    label: `${safeChecked} / ${safeTotal} items`,
  };
}

/** Join recipe titles the way the compact row shows them. */
export function formatRecipeSourceLabel(recipes: string[], allRecipes: string[] = []): string {
  const unique = uniqueTitles(recipes);
  if (unique.length === 0) return '';
  const all = uniqueTitles(allRecipes);
  if (
    all.length >= 2
    && unique.length === all.length
    && unique.every(title => all.includes(title))
  ) {
    return 'All recipes';
  }
  return unique.join(' • ');
}

function uniqueTitles(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of titles) {
    const title = raw.trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    out.push(title);
  }
  return out;
}

export type CategoryTheme = {
  key: string;
  headerBg: string;
  headerFg: string;
};

const THEMES: Record<string, CategoryTheme> = {
  meat: { key: 'meat', headerBg: '#FDECEC', headerFg: '#7A2E2E' },
  dairy: { key: 'dairy', headerBg: '#F3EEF8', headerFg: '#5C3D72' },
  pantry: { key: 'pantry', headerBg: '#EAF3FB', headerFg: '#2F5F86' },
  produce: { key: 'produce', headerBg: '#EEF6EB', headerFg: '#3D5C32' },
  spices: { key: 'spices', headerBg: '#F8F0E4', headerFg: '#6B4A24' },
  bakery: { key: 'bakery', headerBg: '#F6EFE6', headerFg: '#6B4E32' },
  other: { key: 'other', headerBg: '#F4F0EA', headerFg: '#5A4A3E' },
};

/** Pastel header colours keyed from the aisle name. */
export function categoryTheme(name: string): CategoryTheme {
  const lower = name.toLowerCase();
  if (/\b(meat|seafood|fish)\b/.test(lower)) return THEMES.meat;
  if (/\bdairy\b/.test(lower)) return THEMES.dairy;
  if (/\bbakery|bread\b/.test(lower)) return THEMES.bakery;
  if (/\bspice/.test(lower)) return THEMES.spices;
  if (/\b(fruit|veg|produce)\b/.test(lower)) return THEMES.produce;
  if (/\bpantry\b/.test(lower)) return THEMES.pantry;
  return THEMES.other;
}

export type ProgressBarInset = { top: number; left: number };

const DESKTOP_SIDEBAR_PX = 220;
const TABLET_NAV_PX = 52;

/**
 * Fixed progress bar offset so it stays in the shopping column:
 * desktop clears the left rail, tablet sits under the sticky top nav,
 * phone (bottom tabs) pins to the top of the viewport.
 */
export function progressBarInset(viewportWidth: number): ProgressBarInset {
  if (viewportWidth <= 600) return { top: 0, left: 0 };
  if (viewportWidth <= 900) return { top: TABLET_NAV_PX, left: 0 };
  return { top: 0, left: DESKTOP_SIDEBAR_PX };
}
