import type { Ingredient, Recipe } from './db';

export type RecipeFormState = {
  title: string;
  description: string;
  source_url: string;
  image_url: string;
  servings: number;
  prep_time: number | undefined;
  cook_time: number | undefined;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  primary_protein: string;
};

export const EMPTY_RECIPE_FORM: RecipeFormState = {
  title: '',
  description: '',
  source_url: '',
  image_url: '',
  servings: 4,
  prep_time: undefined,
  cook_time: undefined,
  ingredients: [{ amount: '', unit: '', name: '' }],
  steps: [''],
  tags: [],
  primary_protein: '',
};

export function emptyRecipeForm(): RecipeFormState {
  return {
    ...EMPTY_RECIPE_FORM,
    ingredients: [{ amount: '', unit: '', name: '' }],
    steps: [''],
    tags: [],
  };
}

export type ScrapedRecipeFields = {
  title?: string;
  description?: string;
  image_url?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  ingredients?: Ingredient[];
  steps?: string[];
  tags?: string[];
  primary_protein?: string;
};

/** Fresh import fields, keeping the source URL and any image the page omitted. */
export function formFromScrape(
  current: RecipeFormState,
  scraped: ScrapedRecipeFields,
  sourceUrl: string,
): RecipeFormState {
  const ingredients = scraped.ingredients?.filter(ing => ing.name?.trim()) ?? [];
  const steps = scraped.steps?.map(step => step.trim()).filter(Boolean) ?? [];
  return {
    title: scraped.title?.trim() || current.title,
    description: scraped.description?.trim() || '',
    source_url: sourceUrl,
    image_url: scraped.image_url?.trim() || current.image_url,
    servings: scraped.servings && scraped.servings > 0 ? scraped.servings : current.servings,
    prep_time: scraped.prep_time,
    cook_time: scraped.cook_time,
    ingredients: ingredients.length > 0 ? ingredients : current.ingredients,
    steps: steps.length > 0 ? steps : current.steps,
    tags: scraped.tags ?? current.tags,
    primary_protein: scraped.primary_protein ?? current.primary_protein,
  };
}

export function recipeToForm(recipe: Recipe): RecipeFormState {
  return {
    title: recipe.title,
    description: recipe.description || '',
    source_url: recipe.source_url || '',
    image_url: recipe.image_url || '',
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    ingredients: (recipe.ingredients && recipe.ingredients.length > 0)
      ? recipe.ingredients
      : [{ amount: '', unit: '', name: '' }],
    steps: (recipe.steps && recipe.steps.length > 0) ? recipe.steps : [''],
    tags: recipe.tags,
    primary_protein: recipe.primary_protein || '',
  };
}

function ingredientForSave(ing: Ingredient): Ingredient {
  const group = ing.group?.trim();
  if (!group) {
    if (!ing.group) return ing;
    const { group: _drop, ...rest } = ing;
    return rest;
  }
  return group === ing.group ? ing : { ...ing, group };
}

export function recipeFormPayload(form: RecipeFormState) {
  return {
    ...form,
    ingredients: form.ingredients.filter(i => i.name.trim()).map(ingredientForSave),
    steps: form.steps.filter(s => s.trim()),
  };
}

export const DISCARD_UNSAVED_RECIPE_MESSAGE =
  'You have unsaved recipe details. Close and lose your progress?';

export function recipeFormHasContent(form: RecipeFormState): boolean {
  if (form.title.trim()) return true;
  if (form.description.trim()) return true;
  if (form.source_url.trim()) return true;
  if (form.image_url.trim()) return true;
  if (form.prep_time != null) return true;
  if (form.cook_time != null) return true;
  if (form.servings !== EMPTY_RECIPE_FORM.servings) return true;
  if (form.primary_protein.trim()) return true;
  if (form.tags.some(tag => tag.trim())) return true;
  if (form.ingredients.some(ing =>
    `${ing.amount || ''}${ing.unit || ''}${ing.name || ''}`.trim()
  )) return true;
  return form.steps.some(step => step.trim());
}

export function confirmDiscardUnsavedRecipe(hasContent: boolean): boolean {
  return !hasContent || window.confirm(DISCARD_UNSAVED_RECIPE_MESSAGE);
}
