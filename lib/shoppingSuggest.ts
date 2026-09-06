/** Label shown in the add-item autocomplete. Dictionary names are lowercase. */
export function prettyIngredientLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Rank ingredient names for the shopping-list add field.
 * Starts-with (or starts a word) beats a match in the middle; shorter names win ties.
 */
export function ingredientSuggestions(query: string, catalog: string[], limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const seen = new Set<string>();
  const scored: { label: string; score: number }[] = [];

  for (const raw of catalog) {
    const label = prettyIngredientLabel(raw);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const idx = key.indexOf(q);
    if (idx < 0) continue;
    const wordStart = idx === 0 || key.charAt(idx - 1) === ' ';
    scored.push({
      label,
      score: (wordStart ? 0 : 200) + idx + key.length / 100,
    });
  }

  scored.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
  return scored.slice(0, limit).map(s => s.label);
}
