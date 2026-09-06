import type { Ingredient } from './db';
import { autoTag } from './autotag';
import { parseIngredientLine } from './recipeTextParser';
import type { RecipeFormState } from './recipeForm';

const SECTION_HEADER_RE =
  /^(ingredients?|what you'?ll? need|shopping list|you(?:'ll)? need|method|steps?|instructions?|directions?|preparation):?\s*$/i;

const EMPTY_INGREDIENT: Ingredient = { amount: '', unit: '', name: '' };

export function isBlankIngredient(ing: Ingredient): boolean {
  return !`${ing.amount || ''}${ing.unit || ''}${ing.name || ''}`.trim();
}

export function isBlankStep(step: string): boolean {
  return !step.trim();
}

function dropBlanks<T>(items: T[], isBlank: (item: T) => boolean, empty: T): T[] {
  const filled = items.filter(item => !isBlank(item));
  return filled.length > 0 ? filled : [empty];
}

function nonHeaderLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !SECTION_HEADER_RE.test(line));
}

/**
 * Turn a pasted ingredient list into structured rows.
 * Handles one item per line, bullets, and tab-separated amount/unit/name.
 */
export function parseIngredientBlock(text: string): Ingredient[] {
  const out: Ingredient[] = [];
  for (const line of nonHeaderLines(text)) {
    if (line.includes('\t')) {
      const parts = line.split('\t').map(part => part.trim());
      if (parts.length >= 3) {
        const name = parts.slice(2).join(' ');
        if (name) out.push({ amount: parts[0], unit: parts[1], name });
        continue;
      }
      if (parts.length === 2 && parts[1]) {
        out.push({ amount: parts[0], unit: '', name: parts[1] });
        continue;
      }
    }
    out.push(...parseIngredientLine(line));
  }
  return out.filter(ing => ing.name.trim());
}

function stripStepPrefix(line: string): string {
  return line
    .replace(/^[-•*·]+\s*/, '')
    .replace(/^step\s*\d+[\s.:)–\-]*/i, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

function splitNumberedBlob(text: string): string[] | null {
  const parts = text
    .split(/(?:^|\s+)(?:\d+[.)]\s+|step\s*\d+[:.)]\s*)/i)
    .map(part => part.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

/**
 * Turn pasted method text into step rows. Numbered lists and one-item-per-line
 * lists split; a wrapped paragraph without numbering stays one step.
 */
export function parseStepBlock(text: string, opts: { forceSplit?: boolean } = {}): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const numberedBlob = splitNumberedBlob(trimmed.replace(/\s+/g, ' '));
  const lines = nonHeaderLines(trimmed);
  if (lines.length === 0) return numberedBlob ?? [];

  const numberedLines = lines.filter(line => /^(?:\d+[.)]\s+|step\s*\d+)/i.test(line)).length;
  const bulletLines = lines.filter(line => /^[-•*·]\s+\S/.test(line)).length;
  const looksLikeList =
    opts.forceSplit
    || numberedLines >= 2
    || bulletLines >= 2
    || (lines.length >= 2 && numberedBlob && numberedBlob.length >= 2)
    || (lines.length >= 3 && lines.every(line => line.length < 160));

  if (!looksLikeList && numberedBlob && !/\r?\n/.test(trimmed)) {
    return numberedBlob;
  }

  if (!looksLikeList) {
    const joined = stripStepPrefix(lines.join(' '));
    return joined ? [joined] : [];
  }

  return lines.map(stripStepPrefix).filter(Boolean);
}

export function insertParsedIngredients(
  existing: Ingredient[],
  index: number,
  parsed: Ingredient[],
): Ingredient[] {
  if (parsed.length === 0) return existing;
  const row = existing[index];
  const replace = !row || isBlankIngredient(row);
  const before = existing.slice(0, Math.max(0, index));
  const after = existing.slice(Math.max(0, index) + (replace ? 1 : 0));
  const head = replace || !row ? before : [...before, row];
  return dropBlanks([...head, ...parsed, ...after], isBlankIngredient, EMPTY_INGREDIENT);
}

export function insertParsedSteps(
  existing: string[],
  index: number,
  parsed: string[],
): string[] {
  if (parsed.length === 0) return existing;
  const row = existing[index];
  const replace = row === undefined || isBlankStep(row);
  const before = existing.slice(0, Math.max(0, index));
  const after = existing.slice(Math.max(0, index) + (replace ? 1 : 0));
  const head = replace || row === undefined ? before : [...before, row];
  return dropBlanks([...head, ...parsed, ...after], isBlankStep, '');
}

export function appendParsedIngredients(existing: Ingredient[], parsed: Ingredient[]): Ingredient[] {
  return insertParsedIngredients(
    existing,
    existing.findIndex(isBlankIngredient) === -1 ? existing.length : existing.findIndex(isBlankIngredient),
    parsed,
  );
}

export function appendParsedSteps(existing: string[], parsed: string[]): string[] {
  const blank = existing.findIndex(isBlankStep);
  return insertParsedSteps(existing, blank === -1 ? existing.length : blank, parsed);
}

/**
 * If the clipboard text is a list (or a structured single ingredient into an
 * empty row), return parsed rows; otherwise null so native paste can proceed.
 */
export function ingredientPasteFromClipboard(text: string, row: Ingredient): Ingredient[] | null {
  const parsed = parseIngredientBlock(text);
  if (parsed.length === 0) return null;
  if (/\r?\n|\t/.test(text)) return parsed;
  if (parsed.length === 1 && (parsed[0].amount || parsed[0].unit) && isBlankIngredient(row)) {
    return parsed;
  }
  return null;
}

export function stepPasteFromClipboard(text: string): string[] | null {
  if (!text.trim()) return null;
  const parsed = parseStepBlock(text);
  if (parsed.length >= 2) return parsed;
  if (/\r?\n/.test(text) && parseStepBlock(text, { forceSplit: true }).length >= 2) {
    return parseStepBlock(text, { forceSplit: true });
  }
  if (!/\r?\n/.test(text) && parsed.length >= 2) return parsed;
  return null;
}

/** Fill protein when empty and merge cooking-style tags from title, ingredients, and method. */
export function retagRecipeForm(form: RecipeFormState): RecipeFormState {
  const ingredients = form.ingredients.filter(ing => ing.name.trim());
  const steps = form.steps.filter(step => step.trim());
  const auto = autoTag(form.title, ingredients, form.tags, steps);
  return {
    ...form,
    primary_protein: form.primary_protein || auto.primary_protein || '',
    tags: auto.tags,
  };
}
